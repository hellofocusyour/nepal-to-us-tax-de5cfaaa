import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface StudentOption {
  id: string;
  full_name: string;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  defaultStudentId?: string | null;
}

const emptyForm = {
  student_id: "",
  amount: "",
  payment_method: "bank_transfer",
  transaction_reference: "",
  installment_number: "1",
  status: "verified",
  payment_date: new Date().toISOString().slice(0, 10),
  admin_notes: "",
};

const UploadPaymentDialog = ({ open, onOpenChange, onSaved, defaultStudentId }: Props) => {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, student_id: defaultStudentId || "" });
    setFile(null);
    setSearch("");
    supabase.from("students").select("id, full_name, email").order("full_name")
      .then(({ data }) => setStudents((data as StudentOption[]) || []));
  }, [open, defaultStudentId]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students.slice(0, 100);
    return students.filter(s =>
      s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    ).slice(0, 100);
  }, [students, search]);

  const handleSave = async () => {
    if (!form.student_id) { toast.error("Select a student"); return; }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `admin-uploads/${form.student_id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs")
          .upload(path, file, { upsert: true, contentType: file.type || undefined });
        if (upErr) throw new Error(upErr.message);
        proofUrl = path;
      }

      const { error } = await supabase.from("payments").insert({
        student_id: form.student_id,
        amount,
        payment_method: form.payment_method as any,
        transaction_reference: form.transaction_reference.trim() || null,
        installment_number: parseInt(form.installment_number, 10) || 1,
        status: form.status as any,
        payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : new Date().toISOString(),
        proof_url: proofUrl,
        admin_notes: form.admin_notes.trim() || null,
      } as any);
      if (error) throw new Error(error.message);

      toast.success("Payment recorded");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Upload payment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Input placeholder="Search student by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
            <Select value={form.student_id} onValueChange={v => setForm(p => ({ ...p, student_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {filteredStudents.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (NPR)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Installment #</Label>
              <Input type="number" min={1} value={form.installment_number}
                onChange={e => setForm(p => ({ ...p, installment_number: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={form.payment_method} onValueChange={v => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="fonepay">Fonepay</SelectItem>
                  <SelectItem value="ips">IPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Approved</SelectItem>
                  <SelectItem value="pending_verification">Pending verification</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input type="date" value={form.payment_date}
                onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input value={form.transaction_reference}
                onChange={e => setForm(p => ({ ...p, transaction_reference: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment proof (optional)</Label>
            <Input type="file" accept="image/*,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)} />
          </div>

          <div className="space-y-1.5">
            <Label>Admin notes (optional)</Label>
            <Textarea rows={2} value={form.admin_notes}
              onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Save payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadPaymentDialog;
