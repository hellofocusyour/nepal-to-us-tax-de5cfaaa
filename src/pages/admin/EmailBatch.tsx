import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mail, Users, Send, History } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Batch { id: string; name: string }
interface Student { id: string; full_name: string; email: string }
interface RunRow { id: string; batch_name: string | null; template_key: string | null; subject: string; recipient_count: number; sent_count: number; failed_count: number; status: string; created_at: string }

const TEMPLATES: Record<string, { label: string; subject: string; body: string }> = {
  classes_tomorrow_full: {
    label: "Classes Start Tomorrow (full)",
    subject: "Your US Tax Course Begins Tomorrow — Introduction Session",
    body: `Hi {{first_name}},

Welcome to Focus Academy. Your US Tax course with {{batch_name}} begins tomorrow, {{class_date}}, with an Introduction session at {{class_time}}.

In this first session we'll walk you through the course structure, how to use your student dashboard, and what to expect in the weeks ahead. No preparation needed — just bring your questions.

Join here: {{join_link}}
Your dashboard: {{dashboard_url}}

We're looking forward to having you. See you tomorrow.

Warm regards,
Focus Academy Team`,
  },
  warm_reminder: {
    label: "Warm reminder (shorter)",
    subject: "See You Tomorrow — US Tax Course Introduction",
    body: `Hi {{first_name}},

A quick reminder that your first US Tax course class with Focus Academy starts tomorrow, {{class_date}} at {{class_time}}. Tomorrow is an introduction session, so come relaxed — we'll cover how everything works and how to get the most out of your dashboard.

Join link: {{join_link}}
Dashboard: {{dashboard_url}}

Any questions before then, just reply to this email.

Best,
Focus Academy Team`,
  },
  short_nudge: {
    label: "Short nudge",
    subject: "Reminder: US Tax Course Starts Tomorrow",
    body: `Hi {{first_name}}, your US Tax course Introduction class starts tomorrow, {{class_date}} at {{class_time}}. Join via {{join_link}} and log in at {{dashboard_url}}. See you there! — Focus Academy.`,
  },
};

const DASHBOARD_URL = "https://academy.focusyourfinance.com/portal";

const substitute = (text: string, vars: Record<string, string>) =>
  text.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

export default function EmailBatch() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchId, setBatchId] = useState<string>("");
  const [recipients, setRecipients] = useState<Student[]>([]);
  const [tplKey, setTplKey] = useState<string>("classes_tomorrow_full");
  const [subject, setSubject] = useState(TEMPLATES.classes_tomorrow_full.subject);
  const [body, setBody] = useState(TEMPLATES.classes_tomorrow_full.body);
  const [classDate, setClassDate] = useState("");
  const [classTime, setClassTime] = useState("");
  const [joinLink, setJoinLink] = useState("");
  const [sending, setSending] = useState(false);
  const [runs, setRuns] = useState<RunRow[]>([]);

  useEffect(() => {
    supabase.from("batches").select("id, name").order("start_date").then(({ data }) => setBatches((data as any) || []));
    loadRuns();
  }, []);

  const loadRuns = async () => {
    const { data } = await (supabase as any).from("batch_email_runs")
      .select("*").order("created_at", { ascending: false }).limit(20);
    setRuns((data as any) || []);
  };

  useEffect(() => {
    if (!batchId) { setRecipients([]); return; }
    supabase.from("students").select("id, full_name, email")
      .eq("batch_id", batchId).not("email", "is", null)
      .then(({ data }) => setRecipients((data as any) || []));
  }, [batchId]);

  const applyTemplate = (k: string) => {
    setTplKey(k);
    const t = TEMPLATES[k];
    if (t) { setSubject(t.subject); setBody(t.body); }
  };

  const batchName = useMemo(() => batches.find(b => b.id === batchId)?.name || "", [batches, batchId]);
  const previewVars = {
    first_name: "Amit",
    batch_name: batchName || "{{batch_name}}",
    class_date: classDate || "{{class_date}}",
    class_time: classTime || "{{class_time}}",
    join_link: joinLink || "{{join_link}}",
    dashboard_url: DASHBOARD_URL,
  };
  const previewSubject = substitute(subject, previewVars);
  const previewBody = substitute(body, previewVars);

  const send = async () => {
    if (!batchId) return toast.error("Select a batch");
    if (recipients.length === 0) return toast.error("No students with email in this batch");
    if (!subject.trim() || !body.trim()) return toast.error("Subject and body required");

    setSending(true);
    // Build per-recipient payload with shared vars resolved client-side; {{first_name}} resolved server-side via name.
    const sharedVars = {
      batch_name: batchName,
      class_date: classDate,
      class_time: classTime,
      join_link: joinLink,
      dashboard_url: DASHBOARD_URL,
    };
    const resolvedSubject = substitute(subject, { ...sharedVars, first_name: "{{first_name}}" });
    const resolvedBody = substitute(body, { ...sharedVars, first_name: "{{first_name}}" });

    const to = recipients.map(r => ({ id: r.id, name: r.full_name, email: r.email }));
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { to, subject: resolvedSubject, body: resolvedBody },
    });

    let sent = 0, failed = 0, status = "sent";
    if (error) { failed = to.length; status = "failed"; }
    else { sent = (data as any)?.sent ?? 0; failed = (data as any)?.failed ?? 0; status = failed === 0 ? "sent" : (sent === 0 ? "failed" : "partial"); }

    await (supabase as any).from("batch_email_runs").insert({
      batch_id: batchId, batch_name: batchName, template_key: tplKey,
      subject: resolvedSubject, recipient_count: to.length,
      sent_count: sent, failed_count: failed, status, sent_by: user?.id ?? null,
    });

    setSending(false);
    if (error || status === "failed") toast.error("Send failed");
    else if (status === "partial") toast.warning(`Sent ${sent}, failed ${failed}`);
    else toast.success(`Sent to ${sent} student${sent === 1 ? "" : "s"}`);
    loadRuns();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2"><Mail className="w-6 h-6" /> Email a Batch</h1>
        <p className="text-muted-foreground">Send a templated email to every student in a batch.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-5 space-y-4">
          <div>
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger><SelectValue placeholder="Select a batch" /></SelectTrigger>
              <SelectContent>
                {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {batchId && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <Users className="w-3 h-3" /> {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <div>
            <Label>Template</Label>
            <Select value={tplKey} onValueChange={applyTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATES).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Class date</Label><Input value={classDate} onChange={e => setClassDate(e.target.value)} placeholder="Monday, June 15, 2026" /></div>
            <div><Label>Class time</Label><Input value={classTime} onChange={e => setClassTime(e.target.value)} placeholder="8:30 AM NPT" /></div>
          </div>
          <div><Label>Join link</Label><Input value={joinLink} onChange={e => setJoinLink(e.target.value)} placeholder="https://meet.google.com/..." /></div>

          <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={12} /></div>

          <p className="text-xs text-muted-foreground">
            Variables: <code>{"{{first_name}}"}</code>, <code>{"{{batch_name}}"}</code>, <code>{"{{class_date}}"}</code>, <code>{"{{class_time}}"}</code>, <code>{"{{join_link}}"}</code>, <code>{"{{dashboard_url}}"}</code>
          </p>

          <Button onClick={send} disabled={sending || !batchId || recipients.length === 0} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Sending…" : `Send to ${recipients.length} student${recipients.length === 1 ? "" : "s"}`}
          </Button>
        </CardContent></Card>

        <Card><CardContent className="p-5 space-y-3">
          <h2 className="font-display font-bold text-foreground">Preview (sample: first recipient)</h2>
          <div className="rounded border border-border p-4 bg-muted/30 space-y-2">
            <div><span className="text-xs uppercase text-muted-foreground">Subject</span><p className="font-medium">{previewSubject}</p></div>
            <div className="border-t border-border pt-2">
              <span className="text-xs uppercase text-muted-foreground">Body</span>
              <pre className="whitespace-pre-wrap font-sans text-sm mt-1">{previewBody}</pre>
            </div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-display font-bold text-foreground flex items-center gap-2 mb-4"><History className="w-5 h-5" /> Recent batch sends</h2>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bulk sends yet.</p>
          ) : (
            <div className="space-y-2">
              {runs.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded border border-border">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{r.subject}</p>
                    <p className="text-xs text-muted-foreground">{r.batch_name || "—"} · {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{r.sent_count}/{r.recipient_count} sent</Badge>
                    {r.failed_count > 0 && <Badge variant="destructive">{r.failed_count} failed</Badge>}
                    <Badge variant={r.status === "sent" ? "default" : r.status === "partial" ? "secondary" : "destructive"} className="capitalize">{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
