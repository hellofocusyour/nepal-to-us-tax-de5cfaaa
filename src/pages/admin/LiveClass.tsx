import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { computeNextOccurrence, DAY_LABELS } from "@/lib/liveClassSchedule";

interface Settings {
  id?: string;
  batch_id: string | null;
  meet_link: string;
  class_title: string;
  class_description: string | null;
  next_class_at: string | null;
  duration_minutes: number;
  reminder_minutes: number;
  enabled: boolean;
  last_reminder_sent_for: string | null;
  recurrence_enabled: boolean;
  recurrence_days: number[];
  recurrence_time: string;
}

interface BatchOpt { id: string; name: string; }

const GLOBAL = "__global__";
const DEFAULTS: Omit<Settings, "batch_id"> = {
  meet_link: "",
  class_title: "Live Class",
  class_description: "",
  next_class_at: null,
  duration_minutes: 90,
  reminder_minutes: 30,
  enabled: true,
  last_reminder_sent_for: null,
  recurrence_enabled: true,
  recurrence_days: [1, 2, 3, 4],
  recurrence_time: "19:00",
};

function isoToNepalLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function nepalLocalToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(`${local}:00+05:45`);
  return d.toISOString();
}

const LiveClass = () => {
  const [batches, setBatches] = useState<BatchOpt[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>(GLOBAL);
  const [s, setS] = useState<Settings | null>(null);
  const [localTime, setLocalTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("batches").select("id, name").order("start_date", { ascending: false });
      setBatches((data || []) as BatchOpt[]);
    })();
  }, []);

  const loadFor = async (batchKey: string) => {
    setLoading(true);
    const batch_id = batchKey === GLOBAL ? null : batchKey;
    let query = supabase.from("live_class_settings" as any).select("*");
    query = batch_id ? query.eq("batch_id", batch_id) : query.is("batch_id", null);
    const { data } = await query.maybeSingle();
    if (data) {
      const d = data as any as Settings;
      d.recurrence_days = d.recurrence_days ?? [1, 2, 3, 4];
      d.recurrence_time = d.recurrence_time ?? "19:00";
      d.recurrence_enabled = d.recurrence_enabled ?? false;
      d.batch_id = batch_id;
      setS(d);
      setLocalTime(isoToNepalLocal(d.next_class_at));
    } else {
      // No row yet for this batch — seed an in-memory draft
      setS({ ...DEFAULTS, batch_id });
      setLocalTime("");
    }
    setLoading(false);
  };

  useEffect(() => { loadFor(selectedBatch); }, [selectedBatch]);

  const previewNext = useMemo(() => {
    if (!s?.recurrence_enabled) return null;
    return computeNextOccurrence(s.recurrence_days, s.recurrence_time, s.duration_minutes);
  }, [s?.recurrence_enabled, s?.recurrence_days, s?.recurrence_time, s?.duration_minutes]);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    let newIso: string | null;
    if (s.recurrence_enabled) {
      newIso = computeNextOccurrence(s.recurrence_days, s.recurrence_time, s.duration_minutes);
      if (!newIso) {
        setSaving(false);
        toast.error("Pick at least one recurring day");
        return;
      }
    } else {
      newIso = nepalLocalToIso(localTime);
    }
    const resetReminder = newIso !== s.next_class_at;
    const payload: any = {
      batch_id: s.batch_id,
      meet_link: s.meet_link.trim(),
      class_title: s.class_title.trim(),
      class_description: s.class_description,
      next_class_at: newIso,
      duration_minutes: s.duration_minutes,
      reminder_minutes: s.reminder_minutes,
      enabled: s.enabled,
      recurrence_enabled: s.recurrence_enabled,
      recurrence_days: s.recurrence_days,
      recurrence_time: s.recurrence_time,
      ...(resetReminder ? { last_reminder_sent_for: null } : {}),
    };
    let error;
    if (s.id) {
      ({ error } = await supabase.from("live_class_settings" as any).update(payload).eq("id", s.id));
    } else {
      ({ error } = await supabase.from("live_class_settings" as any).insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Live class settings saved");
    loadFor(selectedBatch);
  };

  const sendNow = async () => {
    const { data, error } = await supabase.functions.invoke("class-reminder");
    if (error) { toast.error(error.message); return; }
    toast.success(`Reminder dispatched: ${JSON.stringify(data)}`);
  };

  const toggleDay = (idx: number) => {
    if (!s) return;
    const set = new Set(s.recurrence_days);
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    setS({ ...s, recurrence_days: Array.from(set).sort() });
  };

  if (loading || !s) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Video className="w-7 h-7 text-primary" /> Live Class
        </h1>
        <p className="text-muted-foreground">Configure the Google Meet link, recurring schedule and reminders per batch. The "Default (all other batches)" row is used as a fallback for any batch without its own settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
            <span>Settings for</span>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={GLOBAL}>Default (all other batches)</SelectItem>
                {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/40">
            <div>
              <Label className="text-sm">Enable for this batch</Label>
              <p className="text-xs text-muted-foreground">When off, students in this batch won't see the live class card.</p>
            </div>
            <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
          </div>

          <div>
            <Label>Class title</Label>
            <Input value={s.class_title} onChange={e => setS({ ...s, class_title: e.target.value })} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={s.class_description || ""} onChange={e => setS({ ...s, class_description: e.target.value })} />
          </div>
          <div>
            <Label>Google Meet link</Label>
            <div className="flex gap-2">
              <Input value={s.meet_link} onChange={e => setS({ ...s, meet_link: e.target.value })} placeholder="https://meet.google.com/..." />
              {s.meet_link && (
                <Button variant="outline" size="icon" asChild>
                  <a href={s.meet_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Recurring weekly schedule</Label>
                <p className="text-xs text-muted-foreground">When on, the next class auto-advances to the next selected day at the chosen time (Nepal time).</p>
              </div>
              <Switch checked={s.recurrence_enabled} onCheckedChange={(v) => setS({ ...s, recurrence_enabled: v })} />
            </div>

            {s.recurrence_enabled && (
              <>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Days of week</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {DAY_LABELS.map((label, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={s.recurrence_days.includes(idx)}
                          onCheckedChange={() => toggleDay(idx)}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Class time (Nepal)</Label>
                    <Input
                      type="time"
                      value={s.recurrence_time}
                      onChange={e => setS({ ...s, recurrence_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Next occurrence</Label>
                    <p className="text-sm py-2">
                      {previewNext
                        ? new Date(previewNext).toLocaleString("en-US", {
                            timeZone: "Asia/Kathmandu",
                            weekday: "long", month: "short", day: "numeric",
                            hour: "numeric", minute: "2-digit", hour12: true,
                          }) + " (NPT)"
                        : "—"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {!s.recurrence_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>Next class (Nepal time)</Label>
                <Input type="datetime-local" value={localTime} onChange={e => setLocalTime(e.target.value)} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={s.duration_minutes} onChange={e => setS({ ...s, duration_minutes: parseInt(e.target.value) || 60 })} />
              </div>
            </div>
          )}

          {s.recurrence_enabled && (
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={s.duration_minutes} onChange={e => setS({ ...s, duration_minutes: parseInt(e.target.value) || 60 })} />
            </div>
          )}

          <div>
            <Label>Reminder lead time (minutes before class)</Label>
            <Input type="number" value={s.reminder_minutes} onChange={e => setS({ ...s, reminder_minutes: parseInt(e.target.value) || 30 })} />
            <p className="text-xs text-muted-foreground mt-1">Email + SMS will be sent to students in this batch this many minutes before class starts.</p>
          </div>
          {s.last_reminder_sent_for && (
            <p className="text-xs text-muted-foreground">
              Last reminder sent for class at: {new Date(s.last_reminder_sent_for).toLocaleString()}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button variant="outline" onClick={sendNow}>Send reminder now (test)</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveClass;
