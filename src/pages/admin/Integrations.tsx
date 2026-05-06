import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

const FIELDS = [
  { key: "app_secret", label: "App Secret", help: "From Meta App → Settings → Basic.", secret: true },
  { key: "verify_token", label: "Verify Token", help: "Make this up — any random string. Use the same value in Meta's webhook config.", secret: false },
  { key: "page_access_token", label: "Page Access Token", help: "Covers Messenger + Instagram. Generate in Meta App → Messenger → Settings.", secret: true },
  { key: "whatsapp_token", label: "WhatsApp Token", help: "From Meta App → WhatsApp → API Setup.", secret: true },
  { key: "whatsapp_phone_id", label: "WhatsApp Phone Number ID", help: "From Meta App → WhatsApp → API Setup.", secret: false },
] as const;

type FieldKey = typeof FIELDS[number]["key"];

const Integrations = () => {
  const [creds, setCreds] = useState<Record<FieldKey, string>>({
    app_secret: "", verify_token: "", page_access_token: "", whatsapp_token: "", whatsapp_phone_id: "",
  });
  const [credId, setCredId] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<FieldKey, boolean>>({
    app_secret: false, verify_token: false, page_access_token: false, whatsapp_token: false, whatsapp_phone_id: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{ id: string; created_at: string; action: string; description: string }>>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from("activity_log")
      .select("id, created_at, action, description")
      .eq("entity_type", "webhook")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data ?? []);
    setLogsLoading(false);
  };

  useEffect(() => {
    loadLogs();
    const ch = supabase
      .channel("webhook-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload: any) => {
        if (payload.new?.entity_type === "webhook") {
          setLogs((prev) => [payload.new, ...prev].slice(0, 50));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const simulateIncoming = async (platform: "messenger" | "instagram" | "whatsapp") => {
    setSimulating(platform);
    try {
      const fakeId = `test_${platform}_${Math.floor(Math.random() * 9000 + 1000)}`;
      const names: Record<string, string> = {
        messenger: "Test Messenger User",
        instagram: "test_ig_user",
        whatsapp: "Test WhatsApp",
      };
      const text = `👋 Simulated ${platform} message at ${new Date().toLocaleTimeString()}`;
      const key = `${platform}:${fakeId}`;

      const { data: existing } = await supabase
        .from("conversations")
        .select("unread_count")
        .eq("conversation_key", key)
        .maybeSingle();

      const { error: convErr } = await supabase.from("conversations").upsert({
        conversation_key: key,
        platform,
        customer_id: fakeId,
        customer_name: names[platform],
        last_message_at: new Date().toISOString(),
        last_message_preview: text.slice(0, 200),
        unread_count: (existing?.unread_count ?? 0) + 1,
      }, { onConflict: "conversation_key" });
      if (convErr) throw convErr;

      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_key: key,
        platform,
        direction: "inbound",
        sender_id: fakeId,
        text,
        external_message_id: `sim_${Date.now()}`,
      });
      if (msgErr) throw msgErr;

      toast.success(`Simulated ${platform} message → check Inbox`);
    } catch (e: any) {
      toast.error(e.message ?? "Simulation failed");
    } finally {
      setSimulating(null);
    }
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook`;

  useEffect(() => {
    supabase.from("platform_credentials").select("*").limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setCredId(data.id);
        setCreds({
          app_secret: data.app_secret ?? "",
          verify_token: data.verify_token ?? "",
          page_access_token: data.page_access_token ?? "",
          whatsapp_token: data.whatsapp_token ?? "",
          whatsapp_phone_id: data.whatsapp_phone_id ?? "",
        });
      }
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...creds, updated_by: user?.id, updated_at: new Date().toISOString() };
    let error;
    if (credId) {
      ({ error } = await supabase.from("platform_credentials").update(payload).eq("id", credId));
    } else {
      const res = await supabase.from("platform_credentials").insert(payload).select("id").maybeSingle();
      error = res.error;
      if (res.data) setCredId(res.data.id);
    }
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("Copied");
  };

  const testConnection = async () => {
    if (!creds.page_access_token) {
      toast.error("Enter Page Access Token first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(creds.page_access_token)}`);
      const json = await res.json();
      if (res.ok) setTestResult({ ok: true, msg: `Connected as: ${json.name ?? json.id}` });
      else setTestResult({ ok: false, msg: json.error?.message ?? "Failed" });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message });
    } finally {
      setTesting(false);
    }
  };

  const subscribePage = async () => {
    if (!creds.page_access_token) {
      toast.error("Enter Page Access Token first");
      return;
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${encodeURIComponent(creds.page_access_token)}`,
        { method: "POST" }
      );
      const json = await res.json();
      if (res.ok && json.success) toast.success("Page subscribed to webhook ✓ Messenger + Instagram messages will now arrive in Inbox");
      else toast.error(json.error?.message ?? "Subscribe failed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const verifyWebhookReachable = async () => {
    if (!creds.verify_token) {
      toast.error("Save a Verify Token first");
      return;
    }
    try {
      const probeUrl = `${webhookUrl}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(creds.verify_token)}&hub.challenge=PROBE_OK`;
      const res = await fetch(probeUrl);
      const body = await res.text();
      if (res.ok && body === "PROBE_OK") {
        toast.success("✓ Webhook URL is reachable AND your Verify Token matches. Now paste them into Meta App Dashboard.");
      } else {
        toast.error(`Webhook responded ${res.status}: ${body.slice(0, 120)}`);
      }
    } catch (e: any) {
      toast.error(`Cannot reach webhook: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Messaging Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect Instagram, Messenger, and WhatsApp Business.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Webhook Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Webhook URL</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={webhookUrl} />
              <Button variant="outline" size="icon" onClick={() => copy(webhookUrl)}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <div>
            <Label>Verify Token (current)</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={creds.verify_token || "(not set)"} />
              <Button variant="outline" size="icon" onClick={() => copy(creds.verify_token)} disabled={!creds.verify_token}><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="pt-2">
            <Button variant="outline" onClick={verifyWebhookReachable}>Verify Webhook URL is reachable</Button>
            <p className="text-xs text-muted-foreground mt-2">
              This calls your webhook the same way Meta does. If it returns ✓, the URL works — meaning if no messages arrive,
              the issue is in <strong>Meta App Dashboard</strong>: webhook URL/Verify Token not pasted, or Page/Instagram/WhatsApp not subscribed.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Credentials</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type={f.secret && !shown[f.key] ? "password" : "text"}
                  value={creds[f.key]}
                  onChange={(e) => setCreds((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.key === "verify_token" ? "e.g. my-random-token-12345" : "••••••••"}
                />
                {f.secret && (
                  <Button variant="outline" size="icon" onClick={() => setShown((p) => ({ ...p, [f.key]: !p[f.key] }))}>
                    {shown[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                )}
                {f.key === "verify_token" && (
                  <Button
                    variant="outline"
                    size="icon"
                    title="Generate random token"
                    onClick={() => {
                      const token = crypto.randomUUID().replace(/-/g, "");
                      setCreds((p) => ({ ...p, verify_token: token }));
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{f.help}</p>
              {f.key === "whatsapp_phone_id" && creds.whatsapp_phone_id && /[-+\s]/.test(creds.whatsapp_phone_id) && (
                <p className="text-xs text-destructive mt-1">
                  ⚠ This looks like a phone number. The WhatsApp <strong>Phone Number ID</strong> is a long numeric string (e.g. <code>123456789012345</code>),
                  not your phone number. Find it in Meta App → WhatsApp → API Setup, under your "From" number.
                </p>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button variant="outline" onClick={testConnection} disabled={testing}>
              {testing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Test Connection
            </Button>
            <Button variant="outline" onClick={subscribePage}>Subscribe Page to Webhook</Button>
          </div>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-md ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.msg}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Test Webhook (Simulate Incoming Message)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Inserts a fake inbound message into your Inbox so you can verify the unified inbox UI
            works end-to-end before Meta is fully configured. Open <a href="/admin/inbox" className="text-primary underline">Inbox</a> in another tab to watch it arrive.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => simulateIncoming("messenger")} disabled={simulating === "messenger"}>
              {simulating === "messenger" && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Simulate Messenger DM
            </Button>
            <Button variant="outline" onClick={() => simulateIncoming("instagram")} disabled={simulating === "instagram"}>
              {simulating === "instagram" && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Simulate Instagram DM
            </Button>
            <Button variant="outline" onClick={() => simulateIncoming("whatsapp")} disabled={simulating === "whatsapp"}>
              {simulating === "whatsapp" && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Simulate WhatsApp Message
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Setup Checklist — why messages aren't arriving</CardTitle></CardHeader>
        <CardContent>
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Save your credentials above (App Secret, Verify Token, Page Access Token, WhatsApp Token + Phone ID).</li>
            <li>In <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary underline">Meta App Dashboard</a> → <strong>Webhooks</strong>, add the <strong>Webhook URL</strong> + <strong>Verify Token</strong> shown above for each product (Messenger, Instagram, WhatsApp).</li>
            <li>Subscribe to the <code className="bg-muted px-1 rounded">messages</code> field for each product.</li>
            <li>Click <strong>"Subscribe Page to Webhook"</strong> above — this links your Facebook Page (and connected Instagram) to your app so messages flow in. <strong>Without this step no messages arrive.</strong></li>
            <li>For WhatsApp: in Meta App → WhatsApp → Configuration, also click "Subscribe" for your WhatsApp Business Account.</li>
            <li>If your app is in <strong>Development mode</strong>, only admins/testers of the app can message it. Switch to Live mode for public messaging.</li>
            <li>Send a test DM from another account → it should appear in <strong>Inbox</strong>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
