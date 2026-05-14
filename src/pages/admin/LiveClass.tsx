import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Video, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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
}

// Convert UTC ISO to "yyyy-MM-ddTHH:mm" in Asia/Kathmandu for datetime-local input
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

// "yyyy-MM-ddTHH:mm" Nepal local -> UTC ISO
function nepalLocalToIso(local: string): string | null {
  if (!local) return null;
  // Nepal is UTC+05:45
  const d = new Date(`${local}:00+05:45`);
  return d.toISOString();
}

const LiveClass = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [localTime, setLocalTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("live_class_settings")
      .select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setS(data as Settings);
      setLocalTime(isoToNepalLocal(data.next_class_at));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const newIso = nepalLocalToIso(localTime);
    // Reset reminder tracking if class time changed
    const resetReminder = newIso !== s.next_class_at;
    const { error } = await supabase.from("live_class_settings")
      .update({
        meet_link: s.meet_link.trim(),
        class_title: s.class_title.trim(),
        class_description: s.class_description,
        next_class_at: newIso,
        duration_minutes: s.duration_minutes,
        reminder_minutes: s.reminder_minutes,
        enabled: s.enabled,
        ...(resetReminder ? { last_reminder_sent_for: null } : {}),
      })
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!s) return <p className="text-muted-foreground">No settings found.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Video className="w-7 h-7 text-primary" /> Live Class
        </h1>
        <p className="text-muted-foreground">Manage the Google Meet link and reminders shown to paid students.</p>
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
