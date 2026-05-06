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

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskSignature(signature: string | null) {
  if (!signature) return "null";
  return signature.length > 18 ? `${signature.slice(0, 13)}…${signature.slice(-6)}` : signature;
}

async function getCreds() {
  const { data } = await supabase.from("platform_credentials").select("*").limit(1).maybeSingle();
  return data;
}

async function verifySignature(rawBody: ArrayBuffer, signature: string | null, appSecret: string): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const expected = signature.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, rawBody);
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function logError(context: string, err: unknown, payload?: unknown) {
  console.error(`[webhook][error] ${context}:`, err, payload ? JSON.stringify(payload).slice(0, 500) : "");
  try {
    await supabase.from("activity_log").insert({
      action: "webhook_error",
      description: `${context}: ${err instanceof Error ? err.message : String(err)}`,
      entity_type: "webhook",
    });
  } catch (_) { /* swallow */ }
}

async function upsertConversation(key: string, platform: string, customerId: string, preview: string, customerName?: string) {
  const { data: existing } = await supabase.from("conversations").select("unread_count").eq("conversation_key", key).maybeSingle();
  const unread = (existing?.unread_count ?? 0) + 1;
  const { error } = await supabase.from("conversations").upsert({
    conversation_key: key,
    platform,
    customer_id: customerId,
    customer_name: customerName ?? customerId,
    last_message_at: new Date().toISOString(),
    last_message_preview: preview.slice(0, 200),
    unread_count: unread,
  }, { onConflict: "conversation_key" });
  if (error) await logError("upsertConversation", error, { key, platform });
}

async function insertMessage(key: string, platform: string, senderId: string, text: string, messageType: string, externalId?: string, attachments: any[] = [], senderName?: string, rawPayload?: any) {
  const { error } = await supabase.from("messages").insert({
    conversation_key: key,
    platform,
    direction: "inbound",
    sender_id: senderId,
    sender_name: senderName ?? null,
    text,
    message_type: messageType,
    external_message_id: externalId,
    attachments,
    raw_payload: rawPayload ?? null,
    is_read: false,
  });
  if (error) await logError("insertMessage", error, { key, platform, messageType });
}

function detectMetaType(message: any): { type: string; preview: string; attachments: any[] } {
  if (message?.text) return { type: "text", preview: message.text, attachments: [] };
  const atts = message?.attachments ?? [];
  if (atts.length > 0) {
    const t = atts[0]?.type ?? "attachment";
    return { type: t, preview: `[${t}]`, attachments: atts };
  }
  return { type: "unknown", preview: "[unknown]", attachments: [] };
}

async function processMessenger(entry: any) {
  for (const e of entry) {
    for (const m of (e.messaging ?? [])) {
      try {
        if (m.message?.is_echo) continue;
        const senderId = m.sender?.id;
        if (!senderId) continue;
        const { type, preview, attachments } = detectMetaType(m.message);
        const key = `messenger:${senderId}`;
        await upsertConversation(key, "messenger", senderId, preview);
        await insertMessage(key, "messenger", senderId, preview, type, m.message?.mid, attachments, undefined, m);
      } catch (err) { await logError("processMessenger", err, m); }
    }
  }
}

async function processInstagram(entry: any) {
  for (const e of entry) {
    for (const m of (e.messaging ?? [])) {
      try {
        if (m.message?.is_echo) continue;
        const senderId = m.sender?.id;
        if (!senderId) continue;
        const { type, preview, attachments } = detectMetaType(m.message);
        const key = `instagram:${senderId}`;
        await upsertConversation(key, "instagram", senderId, preview);
        await insertMessage(key, "instagram", senderId, preview, type, m.message?.mid, attachments, undefined, m);
      } catch (err) { await logError("processInstagram", err, m); }
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
        try {
          const from = m.from;
          const type = m.type ?? "unknown";
          let text = "";
          let attachments: any[] = [];
          if (type === "text") text = m.text?.body ?? "";
          else { text = `[${type}]`; attachments = [m[type]].filter(Boolean); }
          const key = `whatsapp:${from}`;
          await upsertConversation(key, "whatsapp", from, text, nameById[from]);
          await insertMessage(key, "whatsapp", from, text, type, m.id, attachments, nameById[from], m);
        } catch (err) { await logError("processWhatsApp", err, m); }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  console.log(`[webhook] ${req.method} ${url.pathname}${url.search}`);

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

  const bodyBuffer = await req.arrayBuffer();
  const rawBody = new TextDecoder().decode(bodyBuffer);
  console.log(`[webhook] POST body length=${rawBody.length} preview=${rawBody.slice(0, 300)}`);

  const creds = await getCreds();
  if (!creds?.app_secret) {
    await logError("config", new Error("Missing app_secret in platform_credentials"));
    return new Response("Not configured", { status: 503, headers: corsHeaders });
  }

  const signature = req.headers.get("x-hub-signature-256") ?? url.searchParams.get("signature") ?? url.searchParams.get("x-hub-signature-256");
  const valid = await verifySignature(bodyBuffer, signature, creds.app_secret);

  if (url.pathname.endsWith("/test-signature")) {
    let parsed: any = null;
    try { parsed = JSON.parse(rawBody); } catch (_) { /* raw body does not have to be JSON for signature testing */ }

    await supabase.from("activity_log").insert({
      action: valid ? "webhook_signature_test" : "webhook_signature_test_failed",
      description: `valid=${valid} bodyLen=${bodyBuffer.byteLength} signature=${maskSignature(signature)} object=${parsed?.object ?? "n/a"} entries=${(parsed?.entry ?? []).length}`,
      entity_type: "webhook",
    });

    return jsonResponse({
      valid,
      bodyBytes: bodyBuffer.byteLength,
      bodyChars: rawBody.length,
      signature: maskSignature(signature),
      object: parsed?.object ?? null,
      entries: parsed?.entry?.length ?? null,
      message: valid ? "Signature matches the posted raw body." : "Signature does not match the posted raw body.",
    }, valid ? 200 : 403);
  }

  if (!valid) {
    await logError("signature", new Error(`Invalid x-hub-signature-256 header=${signature ?? "null"}`));
    return new Response("Invalid signature", { status: 403, headers: corsHeaders });
  }

  let body: any;
  try { body = JSON.parse(rawBody); }
  catch (err) { await logError("parse", err); return new Response("Bad JSON", { status: 400 }); }

  console.log(`[webhook] received object=${body.object} entries=${(body.entry ?? []).length}`);

  try {
    await supabase.from("activity_log").insert({
      action: "webhook_received",
      description: `object=${body.object} entries=${(body.entry ?? []).length} bodyLen=${rawBody.length}`,
      entity_type: "webhook",
    });
  } catch (_) { /* swallow */ }

  (async () => {
    try {
      const entry = body.entry ?? [];
      if (body.object === "page") await processMessenger(entry);
      else if (body.object === "instagram") await processInstagram(entry);
      else if (body.object === "whatsapp_business_account") await processWhatsApp(entry);
      else await logError("unknown_object", new Error(`Unhandled object type: ${body.object}`), body);
    } catch (err) {
      await logError("process", err, body);
    }
  })();

  return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
});
