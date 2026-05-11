// Generic admin-triggered email sender via Resend gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "Focus Academy <onboarding@resend.dev>";

interface Recipient { name?: string | null; email: string }
interface Payload {
  to: Recipient[] | string[];
  subject: string;
  body: string; // plain text or HTML
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

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
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

    const emails = payload.to.map((r) => (typeof r === "string" ? r : r.email)).filter(Boolean);
    if (emails.length === 0) {
      return new Response(JSON.stringify({ error: "No valid email addresses" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = wrapHtml(payload.body);

    // Send individually so recipients don't see each other.
    const results = await Promise.all(
      emails.map(async (to) => {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({ from: FROM, to: [to], subject: payload.subject, html }),
        });
        const data = await res.json().catch(() => ({}));
        return { to, ok: res.ok, status: res.status, data };
      })
    );

    const failed = results.filter((r) => !r.ok);
    return new Response(
      JSON.stringify({ sent: results.length - failed.length, failed: failed.length, results }),
      {
        status: failed.length === results.length ? 502 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
