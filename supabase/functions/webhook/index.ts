// Meta unified webhook: Messenger, Instagram, WhatsApp
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function getCreds() {
  const { data } = await supabase.from("platform_credentials").select("*").limit(1).maybeSingle();
  return data;
}

async function verifySignature(rawBody: string, signature: string | null, appSecret: string): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = signature.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  // timing-safe compare
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function upsertConversation(key: string, platform: string, customerId: string, preview: string, customerName?: string) {
  const { data: existing } = await supabase.from("conversations").select("unread_count").eq("conversation_key", key).maybeSingle();
  const unread = (existing?.unread_count ?? 0) + 1;
  await supabase.from("conversations").upsert({
    conversation_key: key,
    platform,
    customer_id: customerId,
    customer_name: customerName ?? customerId,
    last_message_at: new Date().toISOString(),
    last_message_preview: preview.slice(0, 200),
    unread_count: unread,
  }, { onConflict: "conversation_key" });
}

async function insertMessage(key: string, platform: string, senderId: string, text: string, externalId?: string) {
  await supabase.from("messages").insert({
    conversation_key: key,
    platform,
    direction: "inbound",
    sender_id: senderId,
    text,
    external_message_id: externalId,
  });
}

async function processMessenger(entry: any) {
  for (const e of entry) {
    for (const m of (e.messaging ?? [])) {
      if (m.message?.is_echo) continue;
      const senderId = m.sender?.id;
      const text = m.message?.text ?? "[attachment]";
      if (!senderId) continue;
      const key = `messenger:${senderId}`;
      await upsertConversation(key, "messenger", senderId, text);
      await insertMessage(key, "messenger", senderId, text, m.message?.mid);
    }
  }
}

async function processInstagram(entry: any) {
  for (const e of entry) {
    for (const m of (e.messaging ?? [])) {
      if (m.message?.is_echo) continue;
      const senderId = m.sender?.id;
      const text = m.message?.text ?? "[attachment]";
      if (!senderId) continue;
      const key = `instagram:${senderId}`;
      await upsertConversation(key, "instagram", senderId, text);
      await insertMessage(key, "instagram", senderId, text, m.message?.mid);
    }
  }
}

async function processWhatsApp(entry: any) {
  for (const e of entry) {
    for (const change of (e.changes ?? [])) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};
      const contacts = value.contacts ?? [];
      const nameById: Record<string, string> = {};
      for (const c of contacts) nameById[c.wa_id] = c.profile?.name ?? c.wa_id;
      for (const m of (value.messages ?? [])) {
        const from = m.from;
        const text = m.text?.body ?? `[${m.type}]`;
        const key = `whatsapp:${from}`;
        await upsertConversation(key, "whatsapp", from, text, nameById[from]);
        await insertMessage(key, "whatsapp", from, text, m.id);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  console.log(`[webhook] ${req.method} ${url.pathname}${url.search}`);

  // GET: Meta verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const creds = await getCreds();
    console.log(`[webhook] verify attempt mode=${mode} token_match=${token === creds?.verify_token} has_creds=${!!creds?.verify_token}`);
    if (mode === "subscribe" && token && creds?.verify_token && token === creds.verify_token) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  const creds = await getCreds();
  if (!creds?.app_secret) {
    return new Response("Not configured", { status: 503, headers: corsHeaders });
  }

  const signature = req.headers.get("x-hub-signature-256");
  const valid = await verifySignature(rawBody, signature, creds.app_secret);
  if (!valid) {
    return new Response("Invalid signature", { status: 403, headers: corsHeaders });
  }

  // ack immediately, process async
  let body: any;
  try { body = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

  (async () => {
    try {
      const entry = body.entry ?? [];
      if (body.object === "page") await processMessenger(entry);
      else if (body.object === "instagram") await processInstagram(entry);
      else if (body.object === "whatsapp_business_account") await processWhatsApp(entry);
    } catch (err) {
      console.error("webhook process error", err);
    }
  })();

  return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
});
