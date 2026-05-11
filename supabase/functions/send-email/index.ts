// Generic admin-triggered email sender via Resend gateway. Logs every send to email_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "Focus Academy <hello@focusyourfinance.com>";

interface Recipient { id?: string | null; name?: string | null; email: string; inquiry_id?: string | null }
interface Payload {
  to: Recipient[] | string[];
  subject: string;
  body: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const wrapHtml = (body: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#fff;color:#1f2937;padding:24px;max-width:560px;margin:0 auto;line-height:1.6;">
  ${body.includes("<") ? body : escapeHtml(body).replace(/\n/g, "<br/>")}
  <p style="color:#6b7280;font-size:12px;margin-top:24px;">— Focus Academy</p>
</div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Identify caller (best-effort) for sent_by
  let sentBy: string | null = null;
  const auth = req.headers.get("Authorization");
  if (auth) {
    try {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data } = await userClient.auth.getUser();
      sentBy = data.user?.id ?? null;
    } catch { /* ignore */ }
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1") ?? Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.to || !Array.isArray(payload.to) || payload.to.length === 0) {
      return new Response(JSON.stringify({ error: "Missing recipients" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!payload.subject?.trim() || !payload.body?.trim()) {
      return new Response(JSON.stringify({ error: "Subject and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients: Recipient[] = payload.to.map((r) =>
      typeof r === "string" ? { email: r, name: null } : r
    ).filter((r) => !!r.email);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No valid email addresses" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = wrapHtml(payload.body);

    const results = await Promise.all(
      recipients.map(async (r) => {
        let ok = false, status = 0, errMsg: string | null = null;
        try {
          const res = await fetch(`${GATEWAY_URL}/emails`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({ from: FROM, to: [r.email], subject: payload.subject, html }),
          });
          status = res.status;
          ok = res.ok;
          if (!ok) {
            const data = await res.json().catch(() => ({}));
            errMsg = data?.message || data?.error || `HTTP ${status}`;
          }
        } catch (e) {
          errMsg = (e as Error).message;
        }

        await admin.from("email_logs").insert({
          recipient_name: r.name ?? null,
          recipient_email: r.email,
          subject: payload.subject,
          body: payload.body,
          status: ok ? "sent" : "failed",
          error_message: errMsg,
          sent_by: sentBy,
          inquiry_id: r.inquiry_id ?? r.id ?? null,
        });

        return { to: r.email, ok, status, error: errMsg };
      })
    );

    const failed = results.filter((r) => !r.ok).length;
    return new Response(
      JSON.stringify({ sent: results.length - failed, failed, results }),
      {
        status: failed === results.length ? 502 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
