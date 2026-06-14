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

function pad(n: number) { return n.toString().padStart(2, "0"); }
function nptParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: parseInt(parts.year), m: parseInt(parts.month), d: parseInt(parts.day), dow: map[parts.weekday as string] };
}
function computeNextOccurrence(days: number[], time: string, durationMin: number): string | null {
  if (!days || days.length === 0) return null;
  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const probe = new Date(now.getTime() + i * 86400000);
    const p = nptParts(probe);
    if (!days.includes(p.dow)) continue;
    const iso = new Date(`${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(hh)}:${pad(mm)}:00+05:45`).toISOString();
    if (new Date(iso).getTime() + durationMin * 60000 > now.getTime()) return iso;
  }
  return null;
}




Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load ALL live class settings rows (per-batch + optional global fallback)
    const { data: allSettings } = await supabase
      .from("live_class_settings")
      .select("*");

    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ skipped: "not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const globalRow = allSettings.find((r: any) => r.batch_id === null) || null;
    const perBatchRows = allSettings.filter((r: any) => r.batch_id !== null);

    // Load all batches so the global fallback can apply to those without their own row
    const { data: allBatches } = await supabase.from("batches").select("id");
    const batchIdsWithRow = new Set(perBatchRows.map((r: any) => r.batch_id));
    const fallbackBatchIds = (allBatches || [])
      .map((b: any) => b.id)
      .filter((id: string) => !batchIdsWithRow.has(id));

    // Build dispatch list: each batch -> applicable settings row
    type Dispatch = { batch_id: string | null; settings: any };
    const dispatches: Dispatch[] = [];
    for (const row of perBatchRows) dispatches.push({ batch_id: row.batch_id, settings: row });
    if (globalRow) {
      for (const bid of fallbackBatchIds) dispatches.push({ batch_id: bid, settings: globalRow });
      // Also include students without any batch
      dispatches.push({ batch_id: null, settings: globalRow });
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
    const TEXTBEE_API_KEY = Deno.env.get("TEXTBEE_API_KEY");
    const TEXTBEE_DEVICE_ID = Deno.env.get("TEXTBEE_DEVICE_ID");

    const results: any[] = [];

    for (const { batch_id, settings } of dispatches) {
      if (!settings.enabled || !settings.meet_link) {
        results.push({ batch_id, skipped: "not configured" }); continue;
      }
      let effectiveNextIso: string | null = settings.next_class_at;
      if (settings.recurrence_enabled) {
        effectiveNextIso = computeNextOccurrence(
          settings.recurrence_days || [],
          settings.recurrence_time || "19:00",
          settings.duration_minutes,
        );
      }
      if (!effectiveNextIso) { results.push({ batch_id, skipped: "no upcoming class" }); continue; }

      const now = Date.now();
      const classTime = new Date(effectiveNextIso).getTime();
      const reminderAt = classTime - settings.reminder_minutes * 60_000;
      const alreadySent = settings.last_reminder_sent_for &&
        new Date(settings.last_reminder_sent_for).getTime() === classTime;
      if (alreadySent || now < reminderAt || now >= classTime) {
        results.push({ batch_id, skipped: "outside window" }); continue;
      }

      // Find students for this batch with full access (paid OR sponsored OR access_granted batch)
      let studentQuery = supabase.from("students").select("id, full_name, email, phone, batch_id, sponsor_organization");
      if (batch_id) studentQuery = studentQuery.eq("batch_id", batch_id);
      else studentQuery = studentQuery.is("batch_id", null);
      const { data: batchStudents } = await studentQuery;
      if (!batchStudents || batchStudents.length === 0) {
        results.push({ batch_id, skipped: "no students" }); continue;
      }

      // Determine batch-level access_granted
      let batchAccess = false;
      if (batch_id) {
        const { data: b } = await supabase.from("batches").select("access_granted").eq("id", batch_id).maybeSingle();
        batchAccess = !!(b as any)?.access_granted;
      }

      // Paid students
      const { data: paidPays } = await supabase.from("payments")
        .select("student_id").eq("status", "verified").eq("installment_number", 1)
        .in("student_id", batchStudents.map((s: any) => s.id));
      const paidIds = new Set((paidPays || []).map((p: any) => p.student_id));

      const recipients = batchStudents.filter((s: any) =>
        batchAccess || s.sponsor_organization || paidIds.has(s.id)
      );
      if (recipients.length === 0) {
        results.push({ batch_id, skipped: "no eligible students" }); continue;
      }

      const classDate = new Date(classTime);
      const timeStr = classDate.toLocaleString("en-US", {
        timeZone: "Asia/Kathmandu", hour: "numeric", minute: "2-digit", hour12: true,
      });
      const dateStr = classDate.toLocaleDateString("en-US", {
        timeZone: "Asia/Kathmandu", weekday: "long", month: "short", day: "numeric",
      });

      const subject = `Class starts in ${settings.reminder_minutes} minutes`;
      const smsText = `Focus Academy: Your class "${settings.class_title}" starts in ${settings.reminder_minutes} minutes (${timeStr}). Join: ${settings.meet_link}`;

      let emailsSent = 0, smsSent = 0;
      const emailLogs: any[] = [];
      const smsLogs: any[] = [];

      for (const s of recipients) {
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
              headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: FROM, to: [s.email], subject, html }),
            });
            const ok = r.ok;
            if (ok) emailsSent++;
            emailLogs.push({ recipient_name: s.full_name, recipient_email: s.email, subject, body: html, status: ok ? "sent" : "failed", error_message: ok ? null : await r.text() });
          } catch (e) {
            emailLogs.push({ recipient_name: s.full_name, recipient_email: s.email, subject, body: html, status: "failed", error_message: String(e) });
          }
        }

        const phone = normalizePhone(s.phone || "");
        if (TEXTBEE_API_KEY && TEXTBEE_DEVICE_ID && phone) {
          try {
            const r = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`, {
              method: "POST",
              headers: { "x-api-key": TEXTBEE_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify({ recipients: [phone], message: smsText }),
            });
            const ok = r.ok;
            if (ok) smsSent++;
            smsLogs.push({ recipient_phone: phone, recipient_name: s.full_name, message: smsText, student_id: s.id, status: ok ? "sent" : "failed", error_message: ok ? null : await r.text() });
          } catch (e) {
            smsLogs.push({ recipient_phone: phone, recipient_name: s.full_name, message: smsText, student_id: s.id, status: "failed", error_message: String(e) });
          }
        }
      }

      if (emailLogs.length) await supabase.from("email_logs").insert(emailLogs);
      if (smsLogs.length) await supabase.from("sms_logs").insert(smsLogs);

      await supabase.from("live_class_settings")
        .update({ last_reminder_sent_for: new Date(classTime).toISOString() })
        .eq("id", settings.id);

      results.push({ batch_id, emailsSent, smsSent, recipients: recipients.length });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
