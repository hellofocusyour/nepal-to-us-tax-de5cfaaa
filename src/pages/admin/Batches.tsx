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
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {batch.enrolled_count}/{batch.max_seats}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Batches;
