import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const ObEntrySchema = z.object({
  station_id: z.string().uuid(),
  category: z.enum([
    "CRIMINAL",
    "TRAFFIC",
    "INCIDENT",
    "REPORT",
    "DIRECTIVE",
    "PUBLIC_COMPLAINT",
    "LOST_PROPERTY",
    "OTHER",
  ]),
  subject: z.string().min(5).max(200),
  narrative: z.string().min(10),
  reporting_person_name: z.string().optional(),
  reporting_person_phone: z.string().optional(),
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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
    if (!["OCS", "DEPUTY_OCS", "DUTY_OFFICER_OB_CLERK"].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only Duty Officer / OB Clerk or Station Command can log OB entries" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const parsed = ObEntrySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: parsed.error.format() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { station_id, category, subject, narrative, reporting_person_name, reporting_person_phone } = parsed.data;

    let phoneHash: string | null = null;
    if (reporting_person_phone) {
      const pBuf = new TextEncoder().encode(reporting_person_phone);
      const hBuf = await crypto.subtle.digest("SHA-256", pBuf);
      phoneHash = Array.from(new Uint8Array(hBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    // Insert into ob_entries table. The Postgres database trigger `trg_chain_ob_entry`
    // concurrency-safely allocates the daily sequence number, generates `{seq}/{DD}/{MM}/{YYYY}`,
    // and links the cryptographic SHA-256 hash to the previous entry.
    const { data: entry, error: insertErr } = await adminClient
      .from("ob_entries")
      .insert({
        station_id,
        category,
        subject,
        narrative,
        recorded_by: caller.id,
        created_by: caller.id,
        reporting_person_name: reporting_person_name ?? null,
        reporting_person_phone_hash: phoneHash,
        status: "OPEN",
      })
      .select("id, ob_number, seq_number, entry_hash, previous_entry_hash, entry_timestamp, status")
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Write audit log entry
    await adminClient.from("audit_log").insert({
      station_id,
      action_type: "OB_ENTRY_RECORDED",
      table_name: "ob_entries",
      record_id: entry.id,
      actor_id: caller.id,
      actor_service_number: caller.service_number,
      actor_role: callerRole,
      ip_address: req.headers.get("x-forwarded-for") ?? "127.0.0.1",
      new_data: { ob_number: entry.ob_number, category, subject },
      justification: `Digital OB Entry ${entry.ob_number} recorded`,
    });

    return new Response(JSON.stringify({ success: true, entry }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
