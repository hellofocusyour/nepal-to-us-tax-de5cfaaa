import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Lock, Unlock, Plus, Pencil, History, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import BatchMultiSelect from "@/components/admin/BatchMultiSelect";

interface Module {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  slide_count: number;
  is_unlocked: boolean;
  completed_at: string | null;
  file_path: string | null;
}

interface ModuleVersion {
  id: string;
  module_id: string;
  version_number: number;
  title: string;
  description: string | null;
  slide_count: number;
  file_path: string | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = { module_number: "", title: "", description: "", slide_count: "", notes: "" };

const AdminModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleBatches, setModuleBatches] = useState<Record<string, string[]>>({});
  const [versions, setVersions] = useState<Record<string, ModuleVersion[]>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Module | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Module | null>(null);

  const load = async () => {
    const { data } = await supabase.from("course_modules").select("*").order("module_number");
    setModules((data as unknown as Module[]) || []);
    const { data: links } = await (supabase as any).from("module_batches").select("module_id, batch_id");
    const map: Record<string, string[]> = {};
    (links || []).forEach((l: any) => { (map[l.module_id] ||= []).push(l.batch_id); });
    setModuleBatches(map);
    const { data: vers } = await (supabase as any)
      .from("module_versions").select("*").order("version_number", { ascending: false });
    const vmap: Record<string, ModuleVersion[]> = {};
    ((vers as ModuleVersion[]) || []).forEach(v => { (vmap[v.module_id] ||= []).push(v); });
    setVersions(vmap);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleUnlock = async (m: Module, value: boolean) => {
    const { error } = await supabase.from("course_modules").update({ is_unlocked: value }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(`Module ${m.module_number} ${value ? "unlocked" : "locked"}`);
    load();
  };

  const markCompleteAndUnlockNext = async (m: Module) => {
    const next = modules.find(x => x.module_number === m.module_number + 1);
    const { error } = await supabase.from("course_modules")
      .update({ completed_at: new Date().toISOString() }).eq("id", m.id);
    if (error) return toast.error(error.message);
    if (next) {
      const { error: e2 } = await supabase.from("course_modules")
        .update({ is_unlocked: true }).eq("id", next.id);
      if (e2) return toast.error(e2.message);
      toast.success(`Module ${m.module_number} marked complete. Module ${next.module_number} unlocked.`);
    } else {
      toast.success(`Module ${m.module_number} marked complete.`);
    }
    load();
  };

  const reopen = async (m: Module) => {
    const { error } = await supabase.from("course_modules").update({ completed_at: null }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Marked as not completed");
    load();
  };

  const saveBatches = async (moduleId: string, batchIds: string[]) => {
    setModuleBatches(prev => ({ ...prev, [moduleId]: batchIds }));
    await (supabase as any).from("module_batches").delete().eq("module_id", moduleId);
    if (batchIds.length) {
      const { error } = await (supabase as any).from("module_batches")
        .insert(batchIds.map(bid => ({ module_id: moduleId, batch_id: bid })));
      if (error) return toast.error(error.message);
    }
    toast.success("Batch visibility updated");
  };

  const openCreate = () => {
    setEditing(null);
    const nextNumber = modules.length ? Math.max(...modules.map(m => m.module_number)) + 1 : 1;
    setForm({ ...emptyForm, module_number: String(nextNumber) });
    setFile(null);
    setDialogOpen(true);
  };

  const openEdit = (m: Module) => {
    setEditing(m);
    setForm({
      module_number: String(m.module_number),
      title: m.title,
      description: m.description || "",
      slide_count: String(m.slide_count ?? 0),
      notes: "",
    });
    setFile(null);
    setDialogOpen(true);
  };

  const uploadFile = async (moduleNumber: number, f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `module-${moduleNumber}/v${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("module-pdfs")
      .upload(path, f, { upsert: true, contentType: f.type || "application/pdf" });
    if (error) throw new Error(error.message);
    return path;
  };

  const handleSave = async () => {
    const moduleNumber = parseInt(form.module_number, 10);
    if (!moduleNumber || !form.title.trim()) {
      toast.error("Module number and title are required");
      return;
    }
    setSaving(true);
    try {
      let filePath = editing?.file_path || null;
      if (file) filePath = await uploadFile(moduleNumber, file);

      const payload = {
        module_number: moduleNumber,
        title: form.title.trim(),
        description: form.description.trim() || null,
        slide_count: parseInt(form.slide_count, 10) || 0,
        file_path: filePath,
      };

      let moduleId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("course_modules").update(payload as any).eq("id", editing.id);
        if (error) throw new Error(error.message);
      } else {
        const { data, error } = await supabase.from("course_modules")
          .insert(payload as any).select("id").single();
        if (error) throw new Error(error.message);
        moduleId = (data as any).id;
      }

      // Record a new version snapshot so history is preserved
      const existing = moduleId ? (versions[moduleId] || []) : [];
      const nextVersion = existing.length ? Math.max(...existing.map(v => v.version_number)) + 1 : 1;
      const { error: vErr } = await (supabase as any).from("module_versions").insert({
        module_id: moduleId,
        version_number: nextVersion,
        title: payload.title,
        description: payload.description,
        slide_count: payload.slide_count,
        file_path: payload.file_path,
        notes: form.notes.trim() || (editing ? "Updated" : "Initial version"),
      });
      if (vErr) throw new Error(vErr.message);

      toast.success(editing ? `Module ${moduleNumber} updated (v${nextVersion})` : `Module ${moduleNumber} created`);
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (m: Module, v: ModuleVersion) => {
    const { error } = await supabase.from("course_modules").update({
      title: v.title,
      description: v.description,
      slide_count: v.slide_count,
      file_path: v.file_path,
    } as any).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(`Switched Module ${m.module_number} to version ${v.version_number}`);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await (supabase as any).from("module_batches").delete().eq("module_id", deleting.id);
    const { error } = await supabase.from("course_modules").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success(`Module ${deleting.module_number} deleted`);
    setDeleting(null);
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Course Modules</h1>
          <p className="text-muted-foreground">Add, edit and version modules. Mark a module complete to unlock the next one.</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add module</Button>
      </div>

      <div className="grid gap-4">
        {modules.map((m) => {
          const vlist = versions[m.id] || [];
          return (
            <Card key={m.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span>Module {m.module_number}: {m.title}</span>
                    {m.completed_at && <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>}
                    {m.is_unlocked ? <Badge variant="secondary"><Unlock className="w-3 h-3 mr-1" />Unlocked</Badge> : <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />Locked</Badge>}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.slide_count} slides{vlist.length ? ` · ${vlist.length} version${vlist.length === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Unlocked</span>
                  <Switch checked={m.is_unlocked} onCheckedChange={(v) => toggleUnlock(m, v)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {!m.completed_at ? (
                    <Button onClick={() => markCompleteAndUnlockNext(m)}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />Mark class complete & unlock next
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => reopen(m)}>Re-open module</Button>
                  )}
                  <Button variant="outline" onClick={() => openEdit(m)}>
                    <Pencil className="w-4 h-4 mr-2" />Edit / replace slides
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={() => setDeleting(m)}>
                    <Trash2 className="w-4 h-4 mr-2" />Delete
                  </Button>
                </div>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                      <History className="w-4 h-4 mr-2" />Version history ({vlist.length})
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {vlist.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No versions recorded yet.</p>
                    ) : vlist.map(v => {
                      const isCurrent = (m.file_path || "") === (v.file_path || "") && m.title === v.title;
                      return (
                        <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">v{v.version_number} — {v.title}</span>
                              {isCurrent && <Badge variant="secondary">Current</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {v.slide_count} slides · {new Date(v.created_at).toLocaleString()}
                              {v.notes ? ` · ${v.notes}` : ""}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" disabled={isCurrent} onClick={() => restoreVersion(m, v)}>
                            <RotateCcw className="w-4 h-4 mr-2" />Use this version
                          </Button>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>

                <BatchMultiSelect
                  value={moduleBatches[m.id] || []}
                  onChange={(ids) => saveBatches(m.id, ids)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit Module ${editing.module_number}` : "Add module"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Module number</Label>
                <Input type="number" value={form.module_number}
                  onChange={e => setForm(p => ({ ...p, module_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Slide count</Label>
                <Input type="number" value={form.slide_count}
                  onChange={e => setForm(p => ({ ...p, slide_count: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Slides PDF {editing ? "(optional — replaces current file)" : ""}</Label>
              <Input type="file" accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)} />
              {editing?.file_path && !file && (
                <p className="text-xs text-muted-foreground">Current file: {editing.file_path}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Version note (optional)</Label>
              <Input value={form.notes} placeholder="e.g. Updated examples for 2026"
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">
              Saving keeps the previous version in history — you can switch back anytime.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Save changes" : "Create module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this module?</AlertDialogTitle>
            <AlertDialogDescription>
              Module {deleting?.module_number} ({deleting?.title}) and its version history will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminModules;
