import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const OnboardSchema = z.object({
  station_id: z.string().uuid(),
  service_number: z.string().min(5).max(30).regex(/^KPS-\d+$/, "Must follow standard Kenya Police format e.g. KPS-123456"),
  national_id: z.string().min(6).max(20),
  full_name: z.string().min(3).max(100),
  phone_number: z.string().min(9).max(15),
  email: z.string().email(),
  role_id: z.string().uuid(),
  rank: z.string().min(2).max(50),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // 1. Verify caller has authenticated OCS role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is OCS
    const { data: callerOfficer } = await adminClient
      .from("officers")
      .select("id, role_id, roles!inner(name), station_id, service_number")
      .eq("auth_user_id", user.id)
      .single();

    if (!callerOfficer || (callerOfficer as any).roles?.name !== "OCS") {
      return new Response(JSON.stringify({ error: "Forbidden: Only OCS (Station Commander) can onboard officers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validate input payload
    const body = await req.json();
    const validated = OnboardSchema.safeParse(body);
    if (!validated.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: validated.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { station_id, service_number, national_id, full_name, phone_number, email, role_id, rank } = validated.data;

    // 3. Generate secure invite token and blind index hash
    const inviteToken = crypto.randomUUID();
    const tokenBuffer = new TextEncoder().encode(inviteToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", tokenBuffer);
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: inviteErr } = await adminClient
      .from("officer_invites")
      .insert({
        station_id,
        service_number,
        national_id_hash: tokenHash.substring(0, 32),
        full_name,
        phone_number_hash: tokenHash.substring(32, 64),
        email,
        role_id,
        rank,
        invite_token_hash: tokenHash,
        invited_by: callerOfficer.id,
        expires_at: expiresAt,
        status: "PENDING",
      })
      .select("id, expires_at")
      .single();

    if (inviteErr) {
      return new Response(JSON.stringify({ error: "Failed to create officer invite", details: inviteErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Log in immutable audit log
    await adminClient.from("audit_log").insert({
      station_id,
      action_type: "OFFICER_INVITED",
      table_name: "officer_invites",
      record_id: invite.id,
      actor_id: callerOfficer.id,
      actor_service_number: callerOfficer.service_number,
      actor_role: "OCS",
      ip_address: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
      new_data: { service_number, full_name, email, rank, role_id },
      justification: `OCS initiated onboarding for ${full_name} (${service_number})`,
    });

    const inviteUrl = `${req.headers.get("origin") ?? "https://rpsms.police.gov"}/accept-invite?token=${inviteToken}`;

    return new Response(
      JSON.stringify({
        success: true,
        invite_id: invite.id,
        invite_token: inviteToken,
        invite_url: inviteUrl,
        expires_at: invite.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
