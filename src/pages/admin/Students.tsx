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
import { EmailComposeModal, type EmailRecipient } from "@/components/admin/EmailComposeModal";
import { EmailHistory } from "@/components/admin/EmailHistory";
import { Search, Plus, Eye, Info, MessageSquare, Mail } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Student = Tables<"students">;

const statusConfig: Record<string, { label: string; emoji: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  payment_received: { label: "Payment Received", emoji: "🟢", variant: "default" },
  installment_2_due: { label: "Installment 2 Due", emoji: "🔵", variant: "outline" },
  fully_paid: { label: "Fully Paid", emoji: "🟢", variant: "default" },
  active_student: { label: "Active Student", emoji: "📚", variant: "default" },
  completed: { label: "Completed", emoji: "🏆", variant: "default" },
  certified: { label: "Certified", emoji: "📜", variant: "default" },
};

const PAID_STATUSES = ["payment_received", "installment_2_due", "fully_paid", "active_student", "completed", "certified"] as const;

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
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);

  const fetchStudents = async () => {
    setLoading(true);
    let query = supabase
      .from("students")
      .select("*")
      .in("status", PAID_STATUSES as unknown as Student["status"][])
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter as Student["status"]);
    const { data, error } = await query;
    if (error) {
      console.error("fetch students failed", error);
      toast.error("Failed to load students");
    }
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
    if (error) {
      console.error("add student failed", error);
      toast.error(error.message || "Failed to add student");
      return;
    }

    // Also create an inquiry record so they appear on the Inquiries page
    const { error: inqErr } = await supabase.from("inquiries").insert({
      full_name: newStudent.full_name,
      email: newStudent.email,
      phone: newStudent.phone || null,
      background: newStudent.background || null,
      student_id: studentRow?.id ?? null,
    });
    if (inqErr) console.error("inquiry insert failed", inqErr);

    toast.success("Student added");
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
  const openEmailFor = (recipients: Student[]) => {
    const withEmail = recipients.filter(r => r.email && r.email.trim());
    if (withEmail.length === 0) {
      toast.error("Selected students have no email addresses");
      return;
    }
    setEmailRecipients(withEmail.map(r => ({ name: r.full_name, email: r.email })));
    setEmailOpen(true);
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
          Showing paid students only. Inquiries and unpaid leads appear in the Inquiries section.
        </p>
      </div>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="email">Email History</TabsTrigger>
          <TabsTrigger value="sms">SMS History</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
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

          {selectedIds.size > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-border bg-muted/40 px-4 py-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEmailFor(selectedStudents)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email ({selectedStudents.filter(s => s.email).length})
                </Button>
                <Button size="sm" variant="outline" onClick={() => openSmsFor(selectedStudents)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send SMS ({selectedStudents.filter(s => s.phone).length})
                </Button>
              </div>
            </div>
          )}

          {/* Student Table */}
          <Card className="border border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                        onCheckedChange={(c) => toggleAll(Boolean(c))}
                        aria-label="Select all"
                      />
                    </TableHead>
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
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No students found</TableCell></TableRow>
                  ) : (
                    filtered.map((student) => {
                      const status = statusConfig[student.status] || { label: student.status, emoji: "⚪", variant: "outline" as const };
                      return (
                        <TableRow key={student.id} data-state={selectedIds.has(student.id) ? "selected" : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(student.id)}
                              onCheckedChange={(c) => toggleOne(student.id, Boolean(c))}
                              aria-label={`Select ${student.full_name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell className="hidden md:table-cell">{student.email}</TableCell>
                          <TableCell className="hidden lg:table-cell">{student.phone || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell capitalize">{student.background || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.emoji} {status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(student)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openSmsFor([student])}
                                disabled={!student.phone}
                                title={student.phone ? "Send SMS" : "No phone number"}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <SmsHistory />
        </TabsContent>
      </Tabs>

      <SmsComposeModal
        open={smsOpen}
        onOpenChange={setSmsOpen}
        recipients={smsRecipients}
      />

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
