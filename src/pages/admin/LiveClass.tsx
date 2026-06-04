import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Video, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { computeNextOccurrence, DAY_LABELS } from "@/lib/liveClassSchedule";

interface Settings {
  id: string;
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
  recurrence_time: string; // "HH:MM" NPT
}

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
  const [s, setS] = useState<Settings | null>(null);
  const [localTime, setLocalTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("live_class_settings" as any)
      .select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (data) {
      const d = data as any as Settings;
      // Defaults if columns are freshly added
      d.recurrence_days = d.recurrence_days ?? [1, 2, 3, 4];
      d.recurrence_time = d.recurrence_time ?? "19:00";
      d.recurrence_enabled = d.recurrence_enabled ?? false;
      setS(d);
      setLocalTime(isoToNepalLocal(d.next_class_at));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

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
    const { error } = await supabase.from("live_class_settings" as any)
      .update({
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
      } as any)
      .eq("id", s.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Live class settings saved");
    load();
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!s) return <p className="text-muted-foreground">No settings found.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Video className="w-7 h-7 text-primary" /> Live Class
        </h1>
        <p className="text-muted-foreground">Manage the Google Meet link, recurring schedule, and reminders shown to paid students.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Class details</span>
            <div className="flex items-center gap-2 text-sm font-normal">
              <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
              <span>{s.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Recurring schedule */}
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
            <p className="text-xs text-muted-foreground mt-1">Email + SMS will be sent to all paid students this many minutes before the class starts.</p>
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
