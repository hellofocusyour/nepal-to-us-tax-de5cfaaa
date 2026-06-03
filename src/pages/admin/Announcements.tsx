import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Announcement = Tables<"announcements">;

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target_audience: "all" });
  const [counts, setCounts] = useState({ all: 0, active: 0, enrolled: 0 });

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  const fetchCounts = async () => {
    const { data } = await supabase.from("students").select("status");
    const rows = data || [];
    const active = rows.filter((r: any) => r.status === "active_student").length;
    setCounts({ all: rows.length, active, enrolled: rows.length - active });
  };

  useEffect(() => { fetchAnnouncements(); fetchCounts(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.content) { toast.error("Title and content required"); return; }
    const { error } = await supabase.from("announcements").insert({
      title: form.title,
      content: form.content,
      target_audience: form.target_audience,
      created_by: user?.id,
    });
    if (error) { toast.error("Failed to create"); return; }
    toast.success("Announcement created");
    setForm({ title: "", content: "", target_audience: "all" });
    setDialogOpen(false);
    fetchAnnouncements();
  };

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
          <DialogContent>
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={4} /></div>
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
                    <h3 className="font-display font-bold text-foreground">{ann.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ann.created_at).toLocaleDateString()}</span>
                      <span className="capitalize">To: {ann.target_audience}</span>
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
