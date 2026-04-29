import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  full_name: string;
  email: string;
  phone?: string;
  background?: string;
  redirect_to?: string;
  send_invite?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const { full_name, phone, background, redirect_to } = body;
    const email = body.email?.trim().toLowerCase();

    if (!full_name?.trim() || !email?.trim()) {
      return new Response(JSON.stringify({ error: "full_name and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Record inquiry (existing flow)
    const { error: inqErr } = await admin.from("inquiries").insert({
      full_name,
      email,
      phone: phone || null,
      background: background || null,
    });
    if (inqErr) console.error("inquiry insert", inqErr);

    // 2) Upsert student record (status = 'inquired')
    const { data: existingStudent } = await admin
      .from("students")
      .select("id, user_id")
      .ilike("email", email)
      .maybeSingle();

    if (!existingStudent) {
      await admin.from("students").insert({
        full_name,
        email,
        phone: phone || null,
        background: background || null,
        status: "inquired",
      });
    } else {
      await admin.from("students").update({
        full_name,
        phone: phone || null,
        background: background || null,
      }).eq("id", existingStudent.id);
    }

    // 3) Send magic link (creates the auth user automatically if missing,
    //    so the email/phone they entered become their login credentials)
    const redirect = redirect_to || `${new URL(req.url).origin}`;
    if (body.send_invite !== false) {
      const { error: otpErr } = await admin.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirect,
          data: { full_name, phone: phone || null },
        },
      });

      if (otpErr) {
        console.error("magic link error", otpErr);
        return new Response(JSON.stringify({ error: otpErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 4) Ensure profile + student role exist for the user (best-effort)
    const { data: usersList } = await admin.auth.admin.listUsers();
    const authUser = usersList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (authUser) {
      await admin.from("profiles").upsert(
        {
          user_id: authUser.id,
          full_name,
          email,
          phone: phone || null,
          background: background || null,
        },
        { onConflict: "user_id" }
      );
      // Link student row to user_id
      await admin
        .from("students")
        .update({ user_id: authUser.id, full_name, phone: phone || null, background: background || null })
        .ilike("email", email);
      // Assign student role
      await admin
        .from("user_roles")
        .upsert({ user_id: authUser.id, role: "student" }, { onConflict: "user_id,role" });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
