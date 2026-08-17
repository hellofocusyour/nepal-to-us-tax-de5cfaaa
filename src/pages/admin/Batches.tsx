import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Batch = Tables<"batches">;

const Batches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: "", start_date: "", end_date: "", max_seats: "30" });


  const fetchBatches = async () => {
    const { data } = await supabase.from("batches").select("*").order("start_date", { ascending: false });
    setBatches(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleCreate = async () => {
    if (!newBatch.name || !newBatch.start_date || !newBatch.end_date) {
      toast.error("All fields are required");
      return;
    }
    const { error } = await supabase.from("batches").insert({
      name: newBatch.name,
      start_date: newBatch.start_date,
      end_date: newBatch.end_date,
      max_seats: parseInt(newBatch.max_seats) || 30,
    });
    if (error) { toast.error("Failed to create batch"); return; }
    toast.success("Batch created");
    setNewBatch({ name: "", start_date: "", end_date: "", max_seats: "30" });
    setDialogOpen(false);
    fetchBatches();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const id = deleteTarget.id;
    try {
      await supabase.from("batch_enrollments").delete().eq("batch_id", id);
      await supabase.from("announcement_batches").delete().eq("batch_id", id);
      await supabase.from("document_batches").delete().eq("batch_id", id);
      await supabase.from("module_batches").delete().eq("batch_id", id);
      await supabase.from("video_batches").delete().eq("batch_id", id);
      await supabase.from("class_sessions").delete().eq("batch_id", id);
      await supabase.from("live_class_settings").delete().eq("batch_id", id);
      await supabase.from("students").update({ batch_id: null }).eq("batch_id", id);
      await supabase.from("batch_email_runs").update({ batch_id: null }).eq("batch_id", id);
      const { error } = await supabase.from("batches").delete().eq("id", id);
      if (error) throw error;
      toast.success("Batch deleted");
      setDeleteTarget(null);
      setConfirmText("");
      fetchBatches();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete batch");
    } finally {
      setDeleting(false);
    }
  };


  const toggleComplete = async (batch: Batch) => {
    const next = !(batch as any).is_completed;
    const { error } = await supabase
      .from("batches")
      .update({ is_completed: next, completed_at: next ? new Date().toISOString() : null } as any)
      .eq("id", batch.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? "Batch marked complete" : "Batch reopened");
    fetchBatches();
  };


  const getBatchStatus = (batch: Batch) => {
    const now = new Date();
    const start = new Date(batch.start_date);
    const end = new Date(batch.end_date);
    if (now < start) return { label: "Upcoming", variant: "outline" as const };
    if (now > end) return { label: "Completed", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Batches</h1>
          <p className="text-muted-foreground">Manage course batches</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Batch</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Batch Name</Label><Input value={newBatch.name} onChange={e => setNewBatch(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Batch 5 - March 2026" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={newBatch.start_date} onChange={e => setNewBatch(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={newBatch.end_date} onChange={e => setNewBatch(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Max Seats</Label><Input type="number" value={newBatch.max_seats} onChange={e => setNewBatch(p => ({ ...p, max_seats: e.target.value }))} /></div>
              <Button onClick={handleCreate} className="w-full">Create Batch</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : batches.length === 0 ? (
          <Card className="border border-border"><CardContent className="py-8 text-center text-muted-foreground">No batches yet</CardContent></Card>
        ) : (
          batches.map((batch) => {
            const status = getBatchStatus(batch);
            return (
              <Link key={batch.id} to={`/admin/batches/${batch.id}`} className="block">
              <Card className="border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-foreground">{batch.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(batch.start_date).toLocaleDateString()} — {new Date(batch.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {(batch as any).is_completed && <Badge variant="secondary">Completed</Badge>}
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {batch.enrolled_count}/{batch.max_seats}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleComplete(batch); }}
                      >
                        {(batch as any).is_completed ? "Reopen" : "Complete Batch"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmText(""); setDeleteTarget(batch); }}
                        aria-label={`Delete ${batch.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </Link>
            );
          })
        )}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete batch</DialogTitle>
            <DialogDescription>
              This permanently deletes "{deleteTarget?.name}", its enrollments, sessions, live class settings and
              content assignments. Students are kept but unassigned. Type <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDeleteTarget(null); setConfirmText(""); }}>Cancel</Button>
              <Button variant="destructive" disabled={confirmText !== "DELETE" || deleting} onClick={handleDelete}>
                {deleting ? "Deleting..." : "Delete batch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

};

export default Batches;
