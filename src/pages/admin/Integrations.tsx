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
                  type={shown[f.key] ? "text" : "password"}
                  value={creds[f.key]}
                  onChange={(e) => setCreds((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder="••••••••"
                />
                <Button variant="outline" size="icon" onClick={() => setShown((p) => ({ ...p, [f.key]: !p[f.key] }))}>
                  {shown[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{f.help}</p>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button variant="outline" onClick={testConnection} disabled={testing}>
              {testing && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Test Connection
            </Button>
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
        <CardHeader><CardTitle>Setup Steps</CardTitle></CardHeader>
        <CardContent>
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary underline">developers.facebook.com</a> → your App.</li>
            <li>For each product (Messenger, Instagram, WhatsApp) → Webhooks.</li>
            <li>Paste the <strong>Webhook URL</strong> and <strong>Verify Token</strong> above.</li>
            <li>Subscribe to the <code className="bg-muted px-1 rounded">messages</code> field.</li>
            <li>Copy your App Secret, Page Access Token, WhatsApp Token & Phone Number ID into the form above.</li>
            <li>Click <strong>Save</strong>, then <strong>Test Connection</strong>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default Integrations;
