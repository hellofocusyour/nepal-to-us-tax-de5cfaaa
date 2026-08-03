import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { parseDriveFileId, driveEmbedUrl } from "@/lib/driveUrl";
import { Plus, Pencil, Trash2, ExternalLink, Info, X, Calendar } from "lucide-react";
import { format } from "date-fns";
import BatchMultiSelect from "@/components/admin/BatchMultiSelect";

type Video = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  drive_file_id: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

const SESSION_DISMISS_KEY = "fa_video_drive_reminder_dismissed";

const VideoMaterials = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [editing, setEditing] = useState<Video | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    drive_input: "",
    thumbnail_url: "",
    duration_minutes: "",
    display_order: "0",
    is_published: true,
  });
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const parsedId = parseDriveFileId(form.drive_input);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("video_materials")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setVideos((data as Video[]) || []);
    setLoading(false);
  };


  const sortedVideos = [...videos].sort((a, b) =>
    sortOrder === "newest"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  useEffect(() => {
    load();
    if (!sessionStorage.getItem(SESSION_DISMISS_KEY)) setReminderOpen(true);
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: "", description: "", category: "General", drive_input: "",
      thumbnail_url: "", duration_minutes: "", display_order: "0", is_published: true,
    });
    setSelectedBatches([]);
  };

  const openCreate = () => { resetForm(); setOpen(true); };
  const openEdit = async (v: Video) => {
    setEditing(v);
    setForm({
      title: v.title,
      description: v.description ?? "",
      category: v.category,
      drive_input: v.drive_file_id,
      thumbnail_url: v.thumbnail_url ?? "",
      duration_minutes: v.duration_minutes?.toString() ?? "",
      display_order: v.display_order.toString(),
      is_published: v.is_published,
    });
    const { data: links } = await (supabase as any).from("video_batches").select("batch_id").eq("video_material_id", v.id);
    setSelectedBatches((links || []).map((l: any) => l.batch_id));
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!parsedId) return toast.error("Could not extract a valid Google Drive file ID");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || "General",
      drive_file_id: parsedId,
      thumbnail_url: form.thumbnail_url.trim() || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      display_order: Number(form.display_order) || 0,
      is_published: form.is_published,
      created_by: user?.id ?? null,
    };

    const { data: saved, error } = editing
      ? await supabase.from("video_materials").update(payload).eq("id", editing.id).select("id").single()
      : await supabase.from("video_materials").insert(payload).select("id").single();

    if (error || !saved) return toast.error(error?.message || "Failed");
    const videoId = (saved as any).id;
    // Sync batches
    await (supabase as any).from("video_batches").delete().eq("video_material_id", videoId);
    if (selectedBatches.length) {
      await (supabase as any).from("video_batches")
        .insert(selectedBatches.map(bid => ({ video_material_id: videoId, batch_id: bid })));
    }
    toast.success(editing ? "Video updated" : "Video added");
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async (v: Video) => {
    if (!confirm(`Delete "${v.title}"?`)) return;
    const { error } = await supabase.from("video_materials").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const dismissReminder = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setReminderOpen(false);
  };

  return (
    <div className="space-y-6">
      {reminderOpen && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-start justify-between gap-4">
            <span>
              <strong>Drive sharing reminder:</strong> For every video you add, in Google Drive set sharing to
              {" "}<em>Anyone with the link — Viewer</em>, then click the gear icon in the share dialog and
              {" "}<strong>UNCHECK</strong> "Viewers can download, print, or copy". The /preview embed respects those settings.
            </span>
            <Button size="icon" variant="ghost" onClick={dismissReminder} aria-label="Dismiss">
              <X className="w-4 h-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Video Materials</h1>
          <p className="text-sm text-muted-foreground">Manage Google Drive videos visible to paid students.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Sort by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Upload date: Newest first</SelectItem>
              <SelectItem value="oldest">Upload date: Oldest first</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Video</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : videos.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No videos yet. Add your first one.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {videos.map((v) => (
            <Card key={v.id}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{v.title}</h3>
                    <Badge variant="outline">{v.category}</Badge>
                    {!v.is_published && <Badge variant="secondary">Draft</Badge>}
                  </div>
                  {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-xs text-muted-foreground font-mono">{v.drive_file_id}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Uploaded {format(new Date(v.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" asChild>
                    <a href={driveEmbedUrl(v.drive_file_id)} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(v)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Video" : "Add Video"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Google Drive URL or File ID *</Label>
              <Input
                value={form.drive_input}
                onChange={(e) => setForm({ ...form, drive_input: e.target.value })}
                placeholder="https://drive.google.com/file/d/... or paste the file ID"
              />
              {form.drive_input && (
                <div className="mt-2 text-xs">
                  {parsedId ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Parsed ID:</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded">{parsedId}</code>
                      <Button
                        size="sm" variant="outline" type="button"
                        onClick={() => window.open(driveEmbedUrl(parsedId!), "_blank")}
                      >Test preview</Button>
                    </div>
                  ) : (
                    <span className="text-destructive">Could not extract a valid Drive file ID from that input.</span>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label>Thumbnail URL (optional)</Label>
              <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <Label>Display order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <BatchMultiSelect value={selectedBatches} onChange={setSelectedBatches} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={save} disabled={!parsedId || !form.title.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoMaterials;
