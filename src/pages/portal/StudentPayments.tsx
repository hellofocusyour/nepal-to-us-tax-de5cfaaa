import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CreditCard, Upload, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

const statusBadge: Record<string, string> = {
  pending_verification: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  overdue: "bg-destructive/10 text-destructive",
};

const StudentPayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [txnRef, setTxnRef] = useState("");
  const [installment, setInstallment] = useState("1");
  const [proofFile, setProofFile] = useState<File | null>(null);

  const fetchPayments = async (sid: string) => {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", sid)
      .order("created_at", { ascending: false });
    if (data) setPayments(data);
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (student) {
        setStudentId(student.id);
        await fetchPayments(student.id);
      }
      setLoading(false);
    };
    init();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount || !method) return;
    setSubmitting(true);

    let proofUrl: string | null = null;

    if (proofFile) {
      const ext = proofFile.name.split(".").pop();
      const path = `${studentId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile);
      if (uploadError) {
        toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);
      proofUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("payments").insert({
      student_id: studentId,
      amount: parseFloat(amount),
      payment_method: method as Database["public"]["Enums"]["payment_method"],
      transaction_reference: txnRef || null,
      installment_number: parseInt(installment),
      proof_url: proofUrl,
      payment_date: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment submitted!", description: "Your payment proof is pending verification." });
      setDialogOpen(false);
      setAmount(""); setMethod(""); setTxnRef(""); setProofFile(null);
      await fetchPayments(studentId);
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Payments</h1>
          <p className="text-muted-foreground">Submit payment proof and track status</p>
        </div>
        {studentId && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Submit Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Payment Proof</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (NPR)</Label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Installment</Label>
                    <Select value={installment} onValueChange={setInstallment}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Installment</SelectItem>
                        <SelectItem value="2">2nd Installment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="fonepay">FonePay</SelectItem>
                      <SelectItem value="ips">IPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transaction Reference</Label>
                  <Input value={txnRef} onChange={e => setTxnRef(e.target.value)} placeholder="Transaction ID or reference number" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Proof (screenshot)</Label>
                  <Input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Payment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!studentId ? (
        <Card>
          <CardContent className="pt-6 text-center py-16">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No student profile found.</p>
          </CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-16">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payments recorded yet. Submit your first payment above.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>{payments.length} payment(s) on record</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      NPR {Number(p.amount).toLocaleString()} — Installment {p.installment_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.payment_method?.replace("_", " ")} • {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "N/A"}
                    </p>
                    {p.transaction_reference && (
                      <p className="text-xs text-muted-foreground">Ref: {p.transaction_reference}</p>
                    )}
                    {p.admin_notes && (
                      <p className="text-xs text-destructive mt-1">Note: {p.admin_notes}</p>
                    )}
                  </div>
                  <Badge className={statusBadge[p.status] || "bg-muted"}>
                    {p.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentPayments;
