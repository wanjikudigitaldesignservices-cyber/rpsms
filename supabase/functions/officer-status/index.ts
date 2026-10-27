import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const OfficerStatusSchema = z.object({
  officer_id: z.string().uuid(),
  action: z.enum(["SUSPEND", "REACTIVATE"]),
  reason: z.string().min(10, "A written disciplinary or administrative justification is mandatory"),
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

    if (!caller || (caller as any).roles?.name !== "OCS") {
      return new Response(JSON.stringify({ error: "Forbidden: Only the OCS can suspend or reactivate station officers" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const parsed = OfficerStatusSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { officer_id, action, reason } = parsed.data;

    // Fetch target officer
    const { data: target } = await adminClient
      .from("officers")
      .select("id, full_name, service_number, station_id, status, auth_user_id")
      .eq("id", officer_id)
      .single();

    if (!target) {
      return new Response(JSON.stringify({ error: "Target officer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure OCS cannot suspend themselves
    if (target.id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot modify own station command status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
    const isActive = action === "REACTIVATE";

    await adminClient
      .from("officers")
      .update({
        status: newStatus,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", officer_id);

    // If suspended, invalidate target officer auth sessions
    if (action === "SUSPEND" && target.auth_user_id) {
      try {
        await adminClient.auth.admin.signOut(target.auth_user_id);
      } catch (_e) {
        // Session signout
      }
    }

    // Immutable audit log
    await adminClient.from("audit_log").insert({
      station_id: caller.station_id,
      action_type: action === "SUSPEND" ? "OFFICER_SUSPENDED" : "OFFICER_REACTIVATED",
      table_name: "officers",
      record_id: officer_id,
      actor_id: caller.id,
      actor_service_number: caller.service_number,
      actor_role: "OCS",
      ip_address: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
      new_data: { officer_id, service_number: target.service_number, action, reason },
      justification: reason,
    });

    return new Response(
      JSON.stringify({
        success: true,
        officer_id,
        new_status: newStatus,
        message: `Officer ${target.full_name} (${target.service_number}) has been ${newStatus.toLowerCase()}.`,
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
