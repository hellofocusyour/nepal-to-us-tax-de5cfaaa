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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userRes } = await authed.auth.getUser();
    const caller = userRes?.user;
    if (!caller || caller.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    const email = body.email?.trim().toLowerCase();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const redirectTo = body.redirect_to || `${origin}/admin`;

    // Find existing auth user
    let authUser: any = null;
    const { data: list } = await admin.auth.admin.listUsers();
    authUser = list?.users?.find((u) => u.email?.toLowerCase() === email) ?? null;

    let invited = false;
    if (!authUser) {
      const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      if (invErr) {
        return new Response(JSON.stringify({ error: invErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authUser = inv.user;
      invited = true;
    } else {
      // Send a magic link so they can sign in even if they hadn't completed signup
      await admin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      }).catch(() => {});
    }

    if (!authUser) {
      return new Response(JSON.stringify({ error: "Could not resolve user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure profile
    await admin.from("profiles").upsert(
      { user_id: authUser.id, email },
      { onConflict: "user_id" },
    );

    // Assign admin role (ignore duplicate)
    await admin.from("user_roles").upsert(
      { user_id: authUser.id, role: "admin" },
      { onConflict: "user_id,role" },
    );

    // Grant section permissions
    if (sections.length > 0) {
      const rows = sections.map((s) => ({
        user_id: authUser.id,
        section: s,
        granted_by: caller.id,
      }));
      await admin.from("admin_permissions").upsert(rows, {
        onConflict: "user_id,section",
      });
    }

    return new Response(
      JSON.stringify({ ok: true, invited, user_id: authUser.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
