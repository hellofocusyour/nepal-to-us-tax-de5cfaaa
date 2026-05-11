import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmsComposeModal, type SmsRecipient } from "@/components/admin/SmsComposeModal";
import { SmsHistory } from "@/components/admin/SmsHistory";
import { Search, Plus, Eye, Info, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

const statusConfig: Record<string, { label: string; emoji: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  inquired: { label: "Inquired", emoji: "🔵", variant: "outline" },
  contacted: { label: "Contacted", emoji: "🟡", variant: "secondary" },
  enrolled: { label: "Enrolled", emoji: "🟠", variant: "secondary" },
  payment_received: { label: "Payment Received", emoji: "🟢", variant: "default" },
  installment_2_due: { label: "Installment 2 Due", emoji: "🔵", variant: "outline" },
  fully_paid: { label: "Fully Paid", emoji: "🟢", variant: "default" },
  active_student: { label: "Active Student", emoji: "📚", variant: "default" },
  completed: { label: "Completed", emoji: "🏆", variant: "default" },
  certified: { label: "Certified", emoji: "📜", variant: "default" },
};

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({ full_name: "", email: "", phone: "", background: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsRecipients, setSmsRecipients] = useState<SmsRecipient[]>([]);

  const fetchStudents = async () => {
    setLoading(true);
    // Only show students who have at least one verified payment.
    const { data: paidRows } = await supabase
      .from("payments")
      .select("student_id")
      .eq("status", "verified");
    const paidIds = Array.from(new Set((paidRows || []).map(p => p.student_id).filter(Boolean))) as string[];

    if (paidIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("students")
      .select("*")
      .in("id", paidIds)
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter as Student["status"]);
    const { data } = await query;
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [statusFilter]);

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddStudent = async () => {
    if (!newStudent.full_name || !newStudent.email) {
      toast.error("Name and email are required");
      return;
    }
    const { data: studentRow, error } = await supabase.from("students").insert({
      full_name: newStudent.full_name,
      email: newStudent.email,
      phone: newStudent.phone || null,
      background: newStudent.background || null,
    }).select("id").maybeSingle();
    if (error) { toast.error("Failed to add student"); return; }

    // Also create an inquiry record so they appear on the Inquiries page
    const { error: inqErr } = await supabase.from("inquiries").insert({
      full_name: newStudent.full_name,
      email: newStudent.email,
      phone: newStudent.phone || null,
      background: newStudent.background || null,
      student_id: studentRow?.id ?? null,
    });
    if (inqErr) console.error("inquiry insert failed", inqErr);

    toast.success("Student added and tagged as inquiry");
    setNewStudent({ full_name: "", email: "", phone: "", background: "" });
    setAddDialogOpen(false);
    fetchStudents();
  };

  const updateStatus = async (studentId: string, newStatus: Student["status"]) => {
    const { error } = await supabase.from("students").update({ status: newStatus }).eq("id", studentId);
    if (error) { toast.error("Failed to update status"); return; }
    toast.success("Status updated");
    fetchStudents();
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every(s => selectedIds.has(s.id));
  const someVisibleSelected = filtered.some(s => selectedIds.has(s.id));
  const toggleAll = (checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) filtered.forEach(s => next.add(s.id));
    else filtered.forEach(s => next.delete(s.id));
    setSelectedIds(next);
  };
  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };
  const openSmsFor = (recipients: Student[]) => {
    const withPhone = recipients.filter(r => r.phone && r.phone.trim());
    if (withPhone.length === 0) {
      toast.error("Selected students have no phone numbers");
      return;
    }
    setSmsRecipients(withPhone.map(r => ({ name: r.full_name, phone: r.phone!, student_id: r.id })));
    setSmsOpen(true);
  };
  const selectedStudents = students.filter(s => selectedIds.has(s.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">Manage student lifecycle</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Student</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Full Name *</Label><Input value={newStudent.full_name} onChange={e => setNewStudent(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div><Label>Email *</Label><Input type="email" value={newStudent.email} onChange={e => setNewStudent(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={newStudent.phone} onChange={e => setNewStudent(p => ({ ...p, phone: e.target.value }))} /></div>
              <div>
                <Label>Background</Label>
                <Select value={newStudent.background} onValueChange={v => setNewStudent(p => ({ ...p, background: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select background" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresher">Fresher</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="ca">Chartered Accountant</SelectItem>
                    <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddStudent} className="w-full">Add Student</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        <p className="text-foreground">
          Showing enrolled students only. Unpaid inquiries are managed in the Inquiries section.
        </p>
      </div>

      {/* Filters */}
      <Card className="border border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, { label, emoji }]) => (
                <SelectItem key={key} value={key}>{emoji} {label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Student Table */}
      <Card className="border border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Background</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
              ) : (
                filtered.map((student) => {
                  const status = statusConfig[student.status] || { label: student.status, emoji: "⚪", variant: "outline" as const };
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell className="hidden md:table-cell">{student.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{student.phone || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell capitalize">{student.background || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.emoji} {status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(student)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedStudent.full_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Email</Label><p className="text-sm">{selectedStudent.email}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="text-sm">{selectedStudent.phone || "—"}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Background</Label><p className="text-sm capitalize">{selectedStudent.background || "—"}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Joined</Label><p className="text-sm">{new Date(selectedStudent.created_at).toLocaleDateString()}</p></div>
                </div>

                {/* Lifecycle Tracker */}
                <div>
                  <Label className="text-muted-foreground text-xs mb-3 block">Lifecycle Stage</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusConfig).map(([key, { label, emoji }]) => (
                      <Button
                        key={key}
                        size="sm"
                        variant={selectedStudent.status === key ? "default" : "outline"}
                        onClick={() => updateStatus(selectedStudent.id, key as Student["status"])}
                        className="text-xs"
                      >
                        {emoji} {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-muted-foreground text-xs">Admin Notes</Label>
                  <p className="text-sm mt-1">{selectedStudent.notes || "No notes yet."}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
