// Sends class-starting-soon reminders (email + SMS) to all paid+verified students.
// Triggered by pg_cron every few minutes. Idempotent via last_reminder_sent_for.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Focus Academy <academy@focusyourfinance.com>";

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.trim().replace(/[\s\-()]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return "+" + p.slice(2);
  if (/^9\d{9}$/.test(p)) return "+977" + p;
  if (/^\d{11,15}$/.test(p)) return "+" + p;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: settings } = await supabase
      .from("live_class_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.enabled || !settings.meet_link) {
      return new Response(JSON.stringify({ skipped: "not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute effective next class time (honor recurring schedule when enabled)
    let effectiveNextIso: string | null = settings.next_class_at;
    if (settings.recurrence_enabled) {
      effectiveNextIso = computeNextOccurrence(
        settings.recurrence_days || [],
        settings.recurrence_time || "19:00",
        settings.duration_minutes,
      );
    }
    if (!effectiveNextIso) {
      return new Response(JSON.stringify({ skipped: "no upcoming class" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const classTime = new Date(effectiveNextIso).getTime();
    const reminderAt = classTime - settings.reminder_minutes * 60_000;


    // Send only if we're inside the reminder window and we haven't already sent for this class.
    const alreadySent = settings.last_reminder_sent_for &&
      new Date(settings.last_reminder_sent_for).getTime() === classTime;

    if (alreadySent || now < reminderAt || now >= classTime) {
      return new Response(JSON.stringify({
        skipped: "outside window",
        now: new Date(now).toISOString(),
        reminderAt: new Date(reminderAt).toISOString(),
        classTime: new Date(classTime).toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find paid students (verified installment 1)
    const { data: paidPays } = await supabase
      .from("payments")
      .select("student_id")
      .eq("status", "verified")
      .eq("installment_number", 1);
    const studentIds = Array.from(new Set((paidPays || []).map((p: any) => p.student_id)));
    if (studentIds.length === 0) {
      return new Response(JSON.stringify({ skipped: "no paid students" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, email, phone")
      .in("id", studentIds);

    const classDate = new Date(classTime);
    const timeStr = classDate.toLocaleString("en-US", {
      timeZone: "Asia/Kathmandu",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dateStr = classDate.toLocaleDateString("en-US", {
      timeZone: "Asia/Kathmandu",
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    const subject = `Class starts in ${settings.reminder_minutes} minutes`;
    const smsText =
      `Focus Academy: Your class "${settings.class_title}" starts in ${settings.reminder_minutes} minutes (${timeStr}). Join: ${settings.meet_link}`;

    // Send emails via Resend
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const TEXTBEE_API_KEY = Deno.env.get("TEXTBEE_API_KEY");
    const TEXTBEE_DEVICE_ID = Deno.env.get("TEXTBEE_DEVICE_ID");

    let emailsSent = 0, smsSent = 0;
    const emailLogs: any[] = [];
    const smsLogs: any[] = [];

    for (const s of students || []) {
      const firstName = (s.full_name || "there").split(" ")[0];
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0b1c34">
          <h2 style="margin:0 0 12px;color:#0b1c34">Class starts in ${settings.reminder_minutes} minutes</h2>
          <p>Hi ${firstName},</p>
          <p>Your live class <strong>${settings.class_title}</strong> begins at <strong>${timeStr}</strong> on ${dateStr} (Nepal time).</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${settings.meet_link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Join class on Google Meet</a>
          </p>
          <p style="font-size:13px;color:#64748b">Or copy this link: ${settings.meet_link}</p>
          <p style="margin-top:24px">See you there!<br/>— Focus Academy</p>
        </div>`;

      if (RESEND_KEY && s.email) {
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ from: FROM, to: [s.email], subject, html }),
          });
          const ok = r.ok;
          if (ok) emailsSent++;
          emailLogs.push({
            recipient_name: s.full_name,
            recipient_email: s.email,
            subject,
            body: html,
            status: ok ? "sent" : "failed",
            error_message: ok ? null : await r.text(),
          });
        } catch (e) {
          emailLogs.push({
            recipient_name: s.full_name, recipient_email: s.email,
            subject, body: html, status: "failed", error_message: String(e),
          });
        }
      }

      const phone = normalizePhone(s.phone || "");
      if (TEXTBEE_API_KEY && TEXTBEE_DEVICE_ID && phone) {
        try {
          const r = await fetch(
            `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
            {
              method: "POST",
              headers: { "x-api-key": TEXTBEE_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ recipients: [phone], message: smsText }),
            },
          );
          const ok = r.ok;
          if (ok) smsSent++;
          smsLogs.push({
            recipient_phone: phone, recipient_name: s.full_name, message: smsText,
            student_id: s.id, status: ok ? "sent" : "failed",
            error_message: ok ? null : await r.text(),
          });
        } catch (e) {
          smsLogs.push({
            recipient_phone: phone, recipient_name: s.full_name, message: smsText,
            student_id: s.id, status: "failed", error_message: String(e),
          });
        }
      }
    }

    if (emailLogs.length) await supabase.from("email_logs").insert(emailLogs);
    if (smsLogs.length) await supabase.from("sms_logs").insert(smsLogs);

    await supabase.from("live_class_settings")
      .update({ last_reminder_sent_for: new Date(classTime).toISOString() })
      .eq("id", settings.id);

    return new Response(JSON.stringify({ ok: true, emailsSent, smsSent, recipients: students?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
