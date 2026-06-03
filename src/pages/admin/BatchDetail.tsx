import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Users, Calendar, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface Batch {
  id: string; name: string; start_date: string; end_date: string;
  max_seats: number; enrolled_count: number;
}
interface Student {
  id: string; full_name: string; email: string; phone: string | null; status: string;
}
interface Enrollment {
  id: string; student_id: string; enrolled_at: string; students: Student;
}

const BatchDetail = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [roster, setRoster] = useState<Enrollment[]>([]);
  const [available, setAvailable] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveFor, setMoveFor] = useState<Enrollment | null>(null);
  const [otherBatches, setOtherBatches] = useState<Batch[]>([]);

  const fetchAll = async () => {
    if (!batchId) return;
    const [{ data: b }, { data: e }, { data: unassigned }, { data: other }] = await Promise.all([
      supabase.from("batches").select("*").eq("id", batchId).maybeSingle(),
      supabase.from("batch_enrollments").select("id, student_id, enrolled_at, students(id, full_name, email, phone, status)").eq("batch_id", batchId),
      supabase.from("students").select("id, full_name, email, phone, status").is("batch_id", null).order("full_name"),
      supabase.from("batches").select("*").neq("id", batchId).order("start_date", { ascending: false }),
    ]);
    setBatch(b as Batch | null);
    setRoster((e || []) as any);
    setAvailable((unassigned || []) as any);
    setOtherBatches((other || []) as any);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [batchId]);

  const status = useMemo(() => {
    if (!batch) return null;
    const now = new Date(), s = new Date(batch.start_date), e = new Date(batch.end_date);
    if (now < s) return { label: "Upcoming", variant: "outline" as const };
    if (now > e) return { label: "Completed", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  }, [batch]);

  const seatsLeft = batch ? batch.max_seats - roster.length : 0;
  const isFull = seatsLeft <= 0;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!batch || selected.size === 0) return;
    if (selected.size > seatsLeft) {
      toast.error(`Batch is full — capacity ${batch.max_seats}. Only ${seatsLeft} seat(s) left.`);
      return;
    }
    const rows = Array.from(selected).map(student_id => ({ batch_id: batch.id, student_id }));
    const { error } = await supabase.from("batch_enrollments").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${rows.length} student(s)`);
    setSelected(new Set());
    setPickerOpen(false);
    setSearch("");
    fetchAll();
  };

  const handleRemove = async (enrollmentId: string) => {
    const { error } = await supabase.from("batch_enrollments").delete().eq("id", enrollmentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Removed from batch");
    fetchAll();
  };

  const handleMove = async (newBatchId: string) => {
    if (!moveFor) return;
    const target = otherBatches.find(b => b.id === newBatchId);
    if (target && target.enrolled_count >= target.max_seats) {
      toast.error(`Target batch is full — capacity ${target.max_seats}`);
      return;
    }
    const { error } = await supabase.from("batch_enrollments")
      .update({ batch_id: newBatchId }).eq("id", moveFor.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Student moved");
    setMoveFor(null);
    fetchAll();
  };

  const filteredAvailable = available.filter(s => {
    const q = search.toLowerCase();
    return !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  if (loading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;
  if (!batch) return <p className="text-center py-8 text-muted-foreground">Batch not found</p>;

  return (
    <div className="space-y-6">
      <Link to="/admin/batches" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Batches
      </Link>

      <Card className="border border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-display font-bold text-foreground">{batch.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(batch.start_date).toLocaleDateString()} — {new Date(batch.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" /> {roster.length}/{batch.max_seats}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold">Roster</h2>
        <Dialog open={pickerOpen} onOpenChange={(o) => { setPickerOpen(o); if (!o) { setSelected(new Set()); setSearch(""); } }}>
          <DialogTrigger asChild>
            <Button disabled={isFull} title={isFull ? `Batch is full — capacity ${batch.max_seats}` : undefined}>
              <Plus className="w-4 h-4 mr-2" /> Add Students
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Students to {batch.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left · selected {selected.size}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="border border-border rounded-lg max-h-80 overflow-y-auto">
                {filteredAvailable.length === 0 ? (
                  <p className="p-4 text-sm text-center text-muted-foreground">
                    {available.length === 0 ? "All students are already assigned to a batch." : "No matches."}
                  </p>
                ) : filteredAvailable.map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{s.status.replace(/_/g, " ")}</Badge>
                  </label>
                ))}
              </div>
              <Button onClick={handleAdd} disabled={selected.size === 0} className="w-full">
                Add {selected.size > 0 ? `${selected.size} ` : ""}student{selected.size === 1 ? "" : "s"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-border">
        <CardContent className="p-0">
          {roster.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No students enrolled yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.students.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{e.students.email}</TableCell>
                    <TableCell><Badge variant={e.students.status === "active_student" ? "default" : "outline"} className="capitalize">{e.students.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {otherBatches.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => setMoveFor(e)}>Move</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(e.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!moveFor} onOpenChange={(o) => !o && setMoveFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {moveFor?.students.full_name} to another batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {otherBatches.map(b => {
              const full = b.enrolled_count >= b.max_seats;
              return (
                <button
                  key={b.id}
                  disabled={full}
                  onClick={() => handleMove(b.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div>
                    <p className="font-medium text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.start_date).toLocaleDateString()} — {new Date(b.end_date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{b.enrolled_count}/{b.max_seats}{full ? " · full" : ""}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchDetail;
