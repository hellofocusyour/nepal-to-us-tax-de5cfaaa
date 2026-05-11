import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  phone: string;
  name?: string | null;
  inquiry_id?: string | null;
  student_id?: string | null;
}

interface Payload {
  to: Recipient[];
  message: string;
}

// Normalize Nepali phone numbers to E.164 (+977…)
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return "+" + p.slice(2);
  // Local Nepali 10-digit (starts with 9) → +977
  if (/^9\d{9}$/.test(p)) return "+977" + p;
  // Already includes country digits without +
  if (/^\d{11,15}$/.test(p)) return "+" + p;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TEXTBEE_API_KEY = Deno.env.get("TEXTBEE_API_KEY");
    const TEXTBEE_DEVICE_ID = Deno.env.get("TEXTBEE_DEVICE_ID");
    if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth: require an admin caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.to?.length || !payload?.message?.trim()) {
      return new Response(JSON.stringify({ error: "Missing recipients or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = payload.message.trim();
    const url = `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`;

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const r of payload.to) {
      const normalized = normalizePhone(r.phone || "");
      if (!normalized) {
        failed++;
        await admin.from("sms_logs").insert({
          recipient_phone: r.phone || "",
          recipient_name: r.name ?? null,
          message,
          status: "failed",
          error_message: "Invalid phone number format",
          inquiry_id: r.inquiry_id ?? null,
          student_id: r.student_id ?? null,
          sent_by: userId,
        });
        results.push({ phone: r.phone, status: "failed", error: "invalid phone" });
        continue;
      }

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": TEXTBEE_API_KEY,
          },
          body: JSON.stringify({
            recipients: [normalized],
            message,
          }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          failed++;
          await admin.from("sms_logs").insert({
            recipient_phone: normalized,
            recipient_name: r.name ?? null,
            message,
            status: "failed",
            error_message: `HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 500)}`,
            provider_response: data,
            inquiry_id: r.inquiry_id ?? null,
            student_id: r.student_id ?? null,
            sent_by: userId,
          });
          results.push({ phone: normalized, status: "failed", code: resp.status });
        } else {
          sent++;
          await admin.from("sms_logs").insert({
            recipient_phone: normalized,
            recipient_name: r.name ?? null,
            message,
            status: "sent",
            provider_response: data,
            inquiry_id: r.inquiry_id ?? null,
            student_id: r.student_id ?? null,
            sent_by: userId,
          });
          results.push({ phone: normalized, status: "sent" });
        }
      } catch (err) {
        failed++;
        await admin.from("sms_logs").insert({
          recipient_phone: normalized,
          recipient_name: r.name ?? null,
          message,
          status: "failed",
          error_message: (err as Error).message,
          inquiry_id: r.inquiry_id ?? null,
          student_id: r.student_id ?? null,
          sent_by: userId,
        });
        results.push({ phone: normalized, status: "failed", error: (err as Error).message });
      }
    }

    return new Response(JSON.stringify({ sent, failed, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-sms error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
