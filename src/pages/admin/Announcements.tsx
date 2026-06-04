import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Clock, Timer } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
  expires_at: string | null;
}

const TEMPLATES: Record<string, { title: string; content: string }> = {
  none: { title: "", content: "" },
  postponed: {
    title: "Class Postponed",
    content: "Dear students,\n\nOur upcoming class scheduled for [DATE] at [TIME] has been postponed. We will share the new date and time shortly.\n\nThank you for your patience.\n— Focus Academy",
  },
  cancelled: {
    title: "Class Cancelled",
    content: "Dear students,\n\nThe class scheduled for [DATE] at [TIME] has been cancelled. A recording / make-up session will be arranged.\n\n— Focus Academy",
  },
  rescheduled: {
    title: "Class Rescheduled",
    content: "Dear students,\n\nThe class originally scheduled for [OLD DATE] has been rescheduled to [NEW DATE] at [NEW TIME]. The Google Meet link remains the same.\n\n— Focus Academy",
  },
  new_batch: {
    title: "New Batch Starting Soon",
    content: "Exciting news! Our next batch begins on [START DATE]. Limited seats available — reserve yours today by completing your payment.\n\n— Focus Academy",
  },
};

const EXPIRY_OPTIONS = [
  { value: "none", label: "No expiry" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "1 week" },
  { value: "custom", label: "Custom date/time" },
];

const computeExpiry = (opt: string, custom: string): string | null => {
  if (opt === "none") return null;
  if (opt === "custom") return custom ? new Date(custom).toISOString() : null;
  const now = Date.now();
  const map: Record<string, number> = { "1h": 3600e3, "1d": 86400e3, "3d": 3 * 86400e3, "7d": 7 * 86400e3 };
  return new Date(now + (map[opt] || 0)).toISOString();
};

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [template, setTemplate] = useState("none");
  const [expiryOpt, setExpiryOpt] = useState("none");
  const [customExpiry, setCustomExpiry] = useState("");
  const [form, setForm] = useState({ title: "", content: "", target_audience: "all" });
  const [counts, setCounts] = useState({ all: 0, active: 0, enrolled: 0 });

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements((data as any) || []);
    setLoading(false);
  };

  const fetchCounts = async () => {
    const { data } = await supabase.from("students").select("status");
    const rows = data || [];
    const active = rows.filter((r: any) => r.status === "active_student").length;
    setCounts({ all: rows.length, active, enrolled: rows.length - active });
  };

  useEffect(() => { fetchAnnouncements(); fetchCounts(); }, []);

  const applyTemplate = (key: string) => {
    setTemplate(key);
    const t = TEMPLATES[key];
    if (t && key !== "none") setForm(p => ({ ...p, title: t.title, content: t.content }));
  };

  const handleCreate = async () => {
    if (!form.title || !form.content) { toast.error("Title and content required"); return; }
    const expires_at = computeExpiry(expiryOpt, customExpiry);
    if (expiryOpt === "custom" && !expires_at) { toast.error("Pick a custom expiry date"); return; }
    const { error } = await supabase.from("announcements").insert({
      title: form.title,
      content: form.content,
      target_audience: form.target_audience,
      created_by: user?.id,
      expires_at,
    } as any);
    if (error) { toast.error("Failed to create"); return; }
    toast.success("Announcement created");
    setForm({ title: "", content: "", target_audience: "all" });
    setTemplate("none"); setExpiryOpt("none"); setCustomExpiry("");
    setDialogOpen(false);
    fetchAnnouncements();
  };

  const isExpired = (a: Announcement) => a.expires_at && new Date(a.expires_at).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Announcements</h1>
          <p className="text-muted-foreground">Send communications to students</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Announcement</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template</Label>
                <Select value={template} onValueChange={applyTemplate}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Blank</SelectItem>
                    <SelectItem value="postponed">Class Postponed</SelectItem>
                    <SelectItem value="cancelled">Class Cancelled</SelectItem>
                    <SelectItem value="rescheduled">Class Rescheduled</SelectItem>
                    <SelectItem value="new_batch">New Batch Starting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={6} /></div>
              <div>
                <Label>Target Audience</Label>
                <Select value={form.target_audience} onValueChange={v => setForm(p => ({ ...p, target_audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="active">Active Students Only</SelectItem>
                    <SelectItem value="enrolled">Enrolled Students</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  This will reach {counts[form.target_audience as "all" | "active" | "enrolled"] ?? 0} student{(counts[form.target_audience as "all" | "active" | "enrolled"] ?? 0) === 1 ? "" : "s"}.
                </p>
              </div>
              <div>
                <Label>Expires after</Label>
                <Select value={expiryOpt} onValueChange={setExpiryOpt}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {expiryOpt === "custom" && (
                  <Input
                    type="datetime-local"
                    className="mt-2"
                    value={customExpiry}
                    onChange={e => setCustomExpiry(e.target.value)}
                  />
                )}
                {expiryOpt !== "none" && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Students will stop seeing this after the expiry time.
                  </p>
                )}
              </div>
              <Button onClick={handleCreate} className="w-full">Send Announcement</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : announcements.length === 0 ? (
          <Card className="border border-border"><CardContent className="py-8 text-center text-muted-foreground">No announcements yet</CardContent></Card>
        ) : (
          announcements.map((ann) => (
            <Card key={ann.id} className="border border-border">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-foreground">{ann.title}</h3>
                      {isExpired(ann) && <Badge variant="secondary">Expired</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ann.created_at).toLocaleString()}</span>
                      <span className="capitalize">To: {ann.target_audience}</span>
                      {ann.expires_at && (
                        <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> Expires {new Date(ann.expires_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Announcements;
