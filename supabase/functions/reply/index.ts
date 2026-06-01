// Admin reply: sends to Meta platforms or just records web messages
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = roles?.some((r: any) => r.role === "admin");
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Bad JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  const { platform, recipient_id, text } = body ?? {};
  if (!platform || !recipient_id || !text || typeof text !== "string" || text.length > 4000) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!["web", "messenger", "instagram", "whatsapp"].includes(platform)) {
    return new Response(JSON.stringify({ error: "Invalid platform" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: creds } = await admin.from("platform_credentials").select("*").limit(1).maybeSingle();

  const conversationKey = `${platform}:${recipient_id}`;
  let externalMessageId: string | undefined;

  try {
    if (platform === "messenger" || platform === "instagram") {
      if (!creds?.page_access_token) throw new Error("Page access token not configured");
      const res = await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(creds.page_access_token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipient_id },
          message: { text },
          messaging_type: "RESPONSE",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Send failed");
      externalMessageId = json.message_id;
    } else if (platform === "whatsapp") {
      if (!creds?.whatsapp_token || !creds?.whatsapp_phone_id) throw new Error("WhatsApp not configured");
      const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(creds.whatsapp_phone_id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${creds.whatsapp_token}` },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient_id,
          type: "text",
          text: { body: text },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Send failed");
      externalMessageId = json.messages?.[0]?.id;
    }
    // web: nothing external

    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .maybeSingle();
    const senderName = senderProfile?.full_name?.trim() || senderProfile?.email || "Admin";

    await admin.from("messages").insert({
      conversation_key: conversationKey,
      platform,
      direction: "outbound",
      sender_id: userId,
      sender_name: senderName,
      text,
      external_message_id: externalMessageId,
    });
    await admin.from("conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: text.slice(0, 200),
    }).eq("conversation_key", conversationKey);

    return new Response(JSON.stringify({ ok: true, external_message_id: externalMessageId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("reply error", err);
    return new Response(JSON.stringify({ error: err.message ?? "Send failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
