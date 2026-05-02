import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type TabKey = "syllabus" | "my_courses";

interface Doc {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size: number;
  tab: TabKey;
  uploaded_at: string;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const AdminMyCourses = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("my_courses");
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<{ title: string; description: string; file: File | null }>({ title: "", description: "", file: null });

  const fetchDocs = async () => {
    const { data } = await supabase.from("course_documents").select("*").order("uploaded_at", { ascending: false });
    setDocs((data as Doc[]) || []);
  };

  useEffect(() => { fetchDocs(); }, []);

  const resetForm = () => setForm({ title: "", description: "", file: null });

  const handleUpload = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.file) {
      toast.error("All fields are required"); return;
    }
    if (form.file.size > MAX_SIZE) { toast.error("File must be under 10 MB"); return; }
    if (!ALLOWED.includes(form.file.type) && !/\.(pdf|docx?|DOC|DOCX|PDF)$/.test(form.file.name)) {
      toast.error("Only PDF or DOC/DOCX allowed"); return;
    }
    setUploading(true);
    try {
      const ext = form.file.name.split(".").pop();
      const path = `${activeTab}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("course-documents").upload(path, form.file, { contentType: form.file.type });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("course-documents").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      const fileUrl = signed?.signedUrl || path;
      const { error: insErr } = await supabase.from("course_documents").insert({
        title: form.title.trim(), description: form.description.trim(),
        file_url: fileUrl, file_name: form.file.name, file_size: form.file.size,
        tab: activeTab, uploaded_by: user?.id,
      });
      if (insErr) throw insErr;
      toast.success("Document uploaded");
      setOpen(false); resetForm(); fetchDocs();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const { error } = await supabase.from("course_documents").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); return; }
    toast.success("Deleted");
    fetchDocs();
  };

  const tabDocs = docs.filter(d => d.tab === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Courses</h1>
        <p className="text-sm text-muted-foreground">Manage syllabus and course documents</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            {/* <TabsTrigger value="syllabus">Syllabus</TabsTrigger> */}
            <TabsTrigger value="my_courses">My Courses</TabsTrigger>
          </TabsList>
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Upload
          </Button>
        </div>

        {(["my_courses"] as TabKey[]).map(t => (
          <TabsContent key={t} value={t} className="mt-4">
            {tabDocs.length === 0 ? (
              <Card><CardContent className="py-16 text-center">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No documents yet. Click Upload to add one.</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {tabDocs.map(d => (
                  <Card key={d.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate">{d.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>
                        </div>
                        <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.file_name} · {formatSize(d.file_size)} · {format(new Date(d.uploaded_at), "MMM d, yyyy")}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => window.open(d.file_url, "_blank")}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(d.id)} className="text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload to {activeTab === "syllabus" ? "Syllabus" : "My Courses"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>File (PDF or DOC/DOCX, max 10 MB) *</Label>
              <Input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
            </div>
            <Button className="w-full" onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMyCourses;
