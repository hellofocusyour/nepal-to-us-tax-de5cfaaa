import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAIL = "hello@focusyourfinance.com";

interface Payload {
  email: string;
  sections?: string[];
  redirect_to?: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function findUserByEmail(admin: any, email: string) {
  // Paginate through all users (listUsers default returns first 50)
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data?.users?.find((u: any) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (!data?.users || data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json(401, { error: "Missing Authorization header" });

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const authMailer = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      console.error("getUser failed:", userErr?.message);
      return json(401, { error: "Not signed in. Please sign in again." });
    }
    const caller = userRes.user;
    if (caller.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return json(403, {
        error: `Only ${SUPER_ADMIN_EMAIL} can invite admins. You are signed in as ${caller.email}.`,
      });
    }

    const body = (await req.json()) as Payload;
    const email = body.email?.trim().toLowerCase();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    if (!email) return json(400, { error: "email required" });


    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const redirectTo = body.redirect_to || `${origin}/admin`;

    let authUser: any = null;
    try {
      authUser = await findUserByEmail(admin, email);
    } catch (e) {
      console.error("listUsers failed", e);
    }

    let invited = false;
    let needsSignInEmail = false;
    if (!authUser) {
      const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      if (invErr) {
        // If they already exist (race or paging miss), fall back to lookup
        const existing = await findUserByEmail(admin, email).catch(() => null);
        if (!existing) return json(500, { error: `Invite failed: ${invErr.message}` });
        authUser = existing;
        needsSignInEmail = true;
      } else {
        authUser = inv.user;
        invited = true;
      }
    } else {
      needsSignInEmail = true;
    }

    if (needsSignInEmail) {
      const { error: otpErr } = await authMailer.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (otpErr) return json(500, { error: `Sign-in email failed: ${otpErr.message}` });
    }

    if (!authUser) return json(500, { error: "Could not resolve user" });

    const { error: profErr } = await admin.from("profiles").upsert(
      { user_id: authUser.id, email },
      { onConflict: "user_id" },
    );
    if (profErr) console.warn("profile upsert:", profErr.message);

    const { error: roleErr } = await admin.from("user_roles").upsert(
      { user_id: authUser.id, role: "admin" },
      { onConflict: "user_id,role" },
    );
    if (roleErr) console.warn("role upsert:", roleErr.message);

    if (sections.length > 0) {
      const rows = sections.map((s) => ({
        user_id: authUser.id,
        section: s,
        granted_by: caller.id,
      }));
      const { error: permErr } = await admin.from("admin_permissions").upsert(rows, {
        onConflict: "user_id,section",
      });
      if (permErr) return json(500, { error: `Permissions failed: ${permErr.message}` });
    }

    return json(200, { ok: true, invited, user_id: authUser.id });
  } catch (e) {
    console.error("invite-admin error:", e);
    return json(500, { error: (e as Error).message });
  }
});
