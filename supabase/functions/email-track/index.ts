// Public tracking endpoint for email opens (pixel) and clicks (redirect).
// Called from <img src=".../email-track?e=open&id=..."> and <a href=".../email-track?e=click&id=...&u=...">.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

// 1x1 transparent GIF
const PIXEL = Uint8Array.from([
  0x47,0x49,0x46,0x38,0x39,0x61,0x01,0x00,0x01,0x00,0x80,0x00,0x00,0xff,0xff,0xff,
  0x00,0x00,0x00,0x21,0xf9,0x04,0x01,0x00,0x00,0x00,0x00,0x2c,0x00,0x00,0x00,0x00,
  0x01,0x00,0x01,0x00,0x00,0x02,0x02,0x44,0x01,0x00,0x3b,
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const ev = url.searchParams.get("e");
  const id = url.searchParams.get("id");
  const target = url.searchParams.get("u");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (id && ev === "open") {
      const { data } = await admin.from("email_logs")
        .select("opens_count, first_opened_at").eq("id", id).maybeSingle();
      if (data) {
        await admin.from("email_logs").update({
          opens_count: (data.opens_count ?? 0) + 1,
          last_opened_at: new Date().toISOString(),
          first_opened_at: data.first_opened_at ?? new Date().toISOString(),
        }).eq("id", id);
      }
    } else if (id && ev === "click") {
      const { data } = await admin.from("email_logs")
        .select("clicks_count").eq("id", id).maybeSingle();
      if (data) {
        await admin.from("email_logs").update({
          clicks_count: (data.clicks_count ?? 0) + 1,
          last_clicked_at: new Date().toISOString(),
        }).eq("id", id);
      }
    }
  } catch { /* swallow — never break email rendering */ }

  if (ev === "click" && target) {
    try {
      const dest = new URL(target);
      if (dest.protocol === "http:" || dest.protocol === "https:") {
        return new Response(null, { status: 302, headers: { Location: dest.toString() } });
      }
    } catch { /* fall through */ }
    return new Response("Invalid URL", { status: 400 });
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
});
