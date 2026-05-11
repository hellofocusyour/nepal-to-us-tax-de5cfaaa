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

const LOGO_URL = "https://heupdkfdjdrbdwvzlywf.supabase.co/storage/v1/object/public/email-assets/logo.png";
const SITE_URL = "https://academy.focusyourfinance.com";
const SUPPORT_EMAIL = "hello@focusyourfinance.com";
const SUPPORT_PHONE = "+977 9802374215";

const wrapHtml = (body: string, subject: string) => {
  const content = body.includes("<") ? body : escapeHtml(body).replace(/\n/g, "<br/>");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(subject)} — Focus Academy</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0c4a6e 0%,#075985 50%,#0369a1 100%);padding:28px 32px;text-align:center;">
            <img src="${LOGO_URL}" alt="Focus Academy" width="64" height="64" style="display:inline-block;border-radius:12px;background:#ffffff;padding:6px;margin-bottom:10px;" />
            <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">Focus Academy</div>
            <div style="color:#fcd34d;font-size:12px;font-weight:500;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;">US Tax Career Program</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;line-height:1.65;font-size:15px;color:#1f2937;">
            ${content}
          </td>
        </tr>
        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#e5e7eb;"></div></td></tr>
        <!-- Contact -->
        <tr>
          <td style="padding:20px 32px;font-size:13px;color:#475569;">
            <div style="font-weight:600;color:#0c4a6e;margin-bottom:6px;">Need help?</div>
            <div>📧 <a href="mailto:${SUPPORT_EMAIL}" style="color:#0369a1;text-decoration:none;">${SUPPORT_EMAIL}</a></div>
            <div>📞 ${SUPPORT_PHONE}</div>
            <div style="margin-top:8px;">🌐 <a href="${SITE_URL}" style="color:#0369a1;text-decoration:none;">academy.focusyourfinance.com</a></div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0c4a6e;padding:18px 32px;text-align:center;color:#cbd5e1;font-size:12px;">
            © ${new Date().getFullYear()} Focus Academy · Bridging Nepal to US Tax Careers
            <div style="margin-top:6px;color:#94a3b8;">You received this email because you engaged with Focus Academy.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

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

    const html = wrapHtml(payload.body, payload.subject);

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
