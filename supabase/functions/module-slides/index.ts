// Returns short-lived signed URLs for slides of a single module.
// Access requires: authenticated user, verified payment for installment 1, module is_unlocked.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { module_number } = await req.json();
    if (!module_number) return json({ error: "module_number required" }, 400);

    const admin = createClient(url, service);

    // Check admin OR (paid + unlocked)
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");

    const { data: mod } = await admin.from("course_modules")
      .select("id, module_number, title, slide_count, is_unlocked")
      .eq("module_number", module_number).maybeSingle();
    if (!mod) return json({ error: "module not found" }, 404);

    if (!isAdmin) {
      // Verify paid first installment
      const { data: student } = await admin.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (!student) return json({ error: "no student record" }, 403);
      const { data: pays } = await admin.from("payments")
        .select("installment_number, status").eq("student_id", student.id).eq("status", "verified");
      const paid = (pays || []).some((p: any) => p.installment_number === 1);
      if (!paid) return json({ error: "payment required" }, 403);
      if (!mod.is_unlocked) return json({ error: "module locked" }, 403);
    }

    const paths = Array.from({ length: mod.slide_count }, (_, i) =>
      `module-${mod.module_number}/slide-${String(i + 1).padStart(2, "0")}.jpg`);

    const { data: signed, error } = await admin.storage.from("module-slides")
      .createSignedUrls(paths, 60 * 60);
    if (error) return json({ error: error.message }, 500);

    return json({ module: mod, slides: signed });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
