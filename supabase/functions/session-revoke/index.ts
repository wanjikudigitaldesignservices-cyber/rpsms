import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SessionRevokeSchema = z.object({
  target_officer_id: z.string().uuid(),
  reason: z.string().min(5, "Reason for session revocation is required"),
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

    const { data: caller } = await adminClient
      .from("officers")
      .select("id, role_id, roles!inner(name), station_id, service_number")
      .eq("auth_user_id", user.id)
      .single();

    if (!caller) {
      return new Response(JSON.stringify({ error: "Officer profile not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerRole = (caller as any).roles?.name;
    const body = await req.json();
    const parsed = SessionRevokeSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_officer_id, reason } = parsed.data;

    // Only OCS can revoke other officers' sessions. An officer can only revoke their own session.
    if (target_officer_id !== caller.id && callerRole !== "OCS") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only OCS can remotely revoke other officers' sessions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: target } = await adminClient
      .from("officers")
      .select("id, auth_user_id, service_number, full_name, station_id")
      .eq("id", target_officer_id)
      .single();

    if (!target) {
      return new Response(JSON.stringify({ error: "Target officer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (target.auth_user_id) {
      await adminClient.auth.admin.signOut(target.auth_user_id);
    }

    // Write to audit log
    await adminClient.from("audit_log").insert({
      station_id: target.station_id,
      action_type: "SESSION_REVOKED",
      table_name: "officers",
      record_id: target.id,
      actor_id: caller.id,
      actor_service_number: caller.service_number,
      actor_role: callerRole,
      ip_address: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
      new_data: { target_officer_id, reason },
      justification: reason,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Active session for officer ${target.full_name} (${target.service_number}) was revoked.`,
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
