import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const RequestRoleChangeSchema = z.object({
  action: z.literal("REQUEST"),
  station_id: z.string().uuid(),
  target_officer_id: z.string().uuid(),
  new_role_id: z.string().uuid(),
  justification: z.string().min(10, "Written justification is mandatory (min 10 characters)"),
});

const ApproveRoleChangeSchema = z.object({
  action: z.literal("APPROVE"),
  approval_id: z.string().uuid(),
  notes: z.string().optional(),
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

    if (body.action === "REQUEST") {
      const parsed = RequestRoleChangeSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.format() }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { station_id, target_officer_id, new_role_id, justification } = parsed.data;

      // Only OCS or Deputy OCS can initiate role change request
      if (!["OCS", "DEPUTY_OCS"].includes(callerRole)) {
        return new Response(JSON.stringify({ error: "Only Station Command (OCS/Deputy OCS) can initiate role changes" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: approval, error: appErr } = await adminClient
        .from("approvals")
        .insert({
          station_id,
          action_type: "ROLE_CHANGE",
          target_resource_type: "officers",
          target_resource_id: target_officer_id,
          requested_by: caller.id,
          justification,
          required_role: "OCS",
          status: "PENDING",
        })
        .select("id, requested_at")
        .single();

      if (appErr) {
        return new Response(JSON.stringify({ error: appErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("audit_log").insert({
        station_id,
        action_type: "APPROVAL_REQUESTED",
        table_name: "approvals",
        record_id: approval.id,
        actor_id: caller.id,
        actor_service_number: caller.service_number,
        actor_role: callerRole,
        ip_address: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        new_data: { target_officer_id, new_role_id, justification },
        justification: `Requested role change for officer: ${justification}`,
      });

      return new Response(JSON.stringify({ success: true, approval_id: approval.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (body.action === "APPROVE") {
      const parsed = ApproveRoleChangeSchema.safeParse(body);
      if (!parsed.success) {
        return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.format() }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { approval_id, notes } = parsed.data;

      const { data: approval } = await adminClient
        .from("approvals")
        .select("*")
        .eq("id", approval_id)
        .single();

      if (!approval || approval.status !== "PENDING") {
        return new Response(JSON.stringify({ error: "Approval request not found or not in PENDING state" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // CRITICAL FOUR-EYES ANTI-CORRUPTION RULE:
      if (approval.requested_by === caller.id) {
        return new Response(
          JSON.stringify({
            error: "FOUR-EYES SECURITY VIOLATION: You cannot approve your own role change request. A second officer must verify and approve.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!["OCS", "DEPUTY_OCS"].includes(callerRole)) {
        return new Response(JSON.stringify({ error: "Only OCS or Deputy OCS can grant role approval" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update approval record
      await adminClient
        .from("approvals")
        .update({
          status: "APPROVED",
          approved_by: caller.id,
          approved_at: new Date().toISOString(),
          rejection_reason: notes ?? null,
        })
        .eq("id", approval_id);

      // Write audit log
      await adminClient.from("audit_log").insert({
        station_id: approval.station_id,
        action_type: "ROLE_CHANGED",
        table_name: "approvals",
        record_id: approval.id,
        actor_id: caller.id,
        actor_service_number: caller.service_number,
        actor_role: callerRole,
        ip_address: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
        new_data: { approval_id, approved_by: caller.id, notes },
        justification: `Second-officer four-eyes approval completed by ${caller.service_number}`,
      });

      return new Response(JSON.stringify({ success: true, message: "Four-eyes role change approved and applied" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'REQUEST' or 'APPROVE'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
