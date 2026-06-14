// Sends a branded invitation email to a sponsored/partner-batch student.
// - Creates the auth user if missing (no password — magic link only)
// - Generates a magic link via admin.generateLink (does NOT send the default Supabase email)
// - Sends a branded email via the existing send-email function with the magic link as CTA
// - Ensures profile + student role + students.user_id are wired up
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  batch_id: string;
  student_ids?: string[]; // optional subset; default = whole batch roster
  redirect_to?: string;   // where the magic link lands after auth
}

const PORTAL_URL = "https://academy.focusyourfinance.com/portal";

const buildEmailBody = (firstName: string, batchName: string, sponsor: string | null, link: string) => {
  const sponsorLine = sponsor
    ? `<p>Your seat in <strong>${batchName}</strong> has been sponsored by <strong>${sponsor}</strong> — there's nothing to pay.</p>`
    : `<p>You've been enrolled in <strong>${batchName}</strong>.</p>`;
  return `
    <p>Hi ${firstName},</p>
    <p>Welcome to <strong>Focus Academy's US Tax Course</strong>.</p>
    ${sponsorLine}
    <p>To activate your student account and unlock all course content — modules, videos, documents, and live classes — click the button below. It signs you in instantly; no password to remember.</p>
    <p style="font-size:13px;color:#475569;">If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="${link}" style="color:#0369a1;word-break:break-all;">${link}</a>
    </p>
    <p>After signing in once, you can always return at <a href="${PORTAL_URL}" style="color:#0369a1;">${PORTAL_URL}</a>.</p>
    <p>See you in class,<br/><strong>Focus Academy Team</strong></p>
  `;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { batch_id, student_ids, redirect_to } = (await req.json()) as Payload;
    if (!batch_id) {
      return new Response(JSON.stringify({ error: "batch_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization") || "";
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user: caller } } = await authedClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    if (!roles?.some(r => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load batch
    const { data: batch } = await admin.from("batches")
      .select("id, name, sponsor_organization").eq("id", batch_id).maybeSingle();
    if (!batch) {
      return new Response(JSON.stringify({ error: "batch not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load students in the batch (filter by student_ids if given)
    let q = admin.from("students").select("id, full_name, email, phone").eq("batch_id", batch_id);
    if (student_ids?.length) q = q.in("id", student_ids);
    const { data: students } = await q;
    const recipients = (students || []).filter(s => s.email);

    const redirect = redirect_to || PORTAL_URL;
    const results: Array<{ email: string; ok: boolean; error?: string }> = [];

    for (const s of recipients) {
      try {
        const email = s.email.trim().toLowerCase();

        // Find existing auth user
        let userId: string | null = null;
        const { data: list } = await admin.auth.admin.listUsers();
        const existing = list?.users?.find(u => u.email?.toLowerCase() === email);
        if (existing) {
          userId = existing.id;
        } else {
          const { data: created, error: cErr } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: s.full_name, phone: s.phone || null },
          });
          if (cErr || !created.user) throw new Error(cErr?.message || "createUser failed");
          userId = created.user.id;
        }

        // Wire profile + role + students.user_id
        await admin.from("profiles").upsert(
          { user_id: userId, full_name: s.full_name, email, phone: s.phone || null },
          { onConflict: "user_id" },
        );
        await admin.from("user_roles").upsert(
          { user_id: userId, role: "student" }, { onConflict: "user_id,role" },
        );
        await admin.from("students").update({ user_id: userId }).eq("id", s.id);

        // Generate magic link (does NOT send default email)
        const { data: linkData, error: lErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: redirect },
        });
        if (lErr || !linkData?.properties?.action_link) {
          throw new Error(lErr?.message || "generateLink failed");
        }
        const actionLink = linkData.properties.action_link;

        const firstName = s.full_name?.split(" ")[0] || "there";
        const html = buildEmailBody(firstName, batch.name, batch.sponsor_organization, actionLink);

        // Send branded email via existing send-email function (forwarding caller auth)
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: anonKey,
          },
          body: JSON.stringify({
            to: [{ id: s.id, name: s.full_name, email }],
            subject: `Activate your seat — ${batch.name}`,
            body: html,
            cta_label: "Activate my account",
            cta_url: actionLink,
          }),
        });
        if (!sendRes.ok) {
          const t = await sendRes.text();
          throw new Error(`send-email ${sendRes.status}: ${t.slice(0, 200)}`);
        }

        results.push({ email, ok: true });
      } catch (e) {
        console.error("invite error for", s.email, e);
        results.push({ email: s.email, ok: false, error: (e as Error).message });
      }
    }

    const sent = results.filter(r => r.ok).length;
    const failed = results.length - sent;
    return new Response(JSON.stringify({ ok: true, sent, failed, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
