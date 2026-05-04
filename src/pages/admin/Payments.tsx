import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Eye, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaymentWithStudent {
  id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  installment_number: number;
  status: string;
  payment_date: string | null;
  proof_url: string | null;
  rejection_reason: string | null;
  created_at: string;
  students: { full_name: string; email: string; phone: string | null } | null;
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_verification: { label: "Pending", variant: "outline" },
  verified: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  overdue: { label: "Overdue", variant: "destructive" },
};

const Payments = () => {
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithStudent | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<PaymentWithStudent | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const h = params.get("highlight");
    if (h) setHighlightId(h);
  }, []);

  const resolveProofUrl = async (rawUrl: string | null): Promise<string | null> => {
    if (!rawUrl) return null;
    // Extract the storage object path from either a full URL or raw path
    let path = rawUrl;
    const marker = "/payment-proofs/";
    const idx = rawUrl.indexOf(marker);
    if (idx !== -1) path = rawUrl.substring(idx + marker.length);
    const { data, error } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 60 * 60);
    if (error) {
      console.error("signed url error", error);
      return null;
    }
    return data.signedUrl;
  };

  const fetchPayments = async () => {
    let query = supabase
      .from("payments")
      .select("*, students(full_name, email, phone)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter as "pending_verification" | "verified" | "rejected" | "overdue");
    const { data } = await query;
    const rows = (data as unknown as PaymentWithStudent[]) || [];
    // Resolve signed URLs for private bucket proofs
    const resolved = await Promise.all(
      rows.map(async (p) => ({ ...p, proof_url: await resolveProofUrl(p.proof_url) }))
    );
    setPayments(resolved);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [statusFilter]);

  const filtered = payments.filter(p =>
    p.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.transaction_reference?.toLowerCase().includes(search.toLowerCase())
  );

  const sendStatusEmail = async (payment: PaymentWithStudent, event: "approved" | "rejected", reason?: string) => {
    if (!payment.students) return;
    await supabase.functions.invoke("payments-notify", {
      body: {
        event,
        student: {
          full_name: payment.students.full_name,
          email: payment.students.email,
          phone: payment.students.phone,
        },
        payment: {
          id: payment.id,
          reference: payment.transaction_reference || "",
          amount: Number(payment.amount),
          installment_number: payment.installment_number,
          is_full: payment.installment_number === 1 && Number(payment.amount) === 20000,
          payment_method: payment.payment_method,
          rejection_reason: reason,
        },
      },
    }).catch(e => console.error("status email", e));
  };

  const approvePayment = async (payment: PaymentWithStudent) => {
    const { error } = await supabase.from("payments").update({ status: "verified" }).eq("id", payment.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Payment approved");
    sendStatusEmail(payment, "approved");
    fetchPayments();
    setSelectedPayment(null);
  };

  const confirmReject = async () => {
    if (!rejectingPayment) return;
    if (!rejectReason.trim()) { toast.error("Please enter a reason"); return; }
    const { error } = await supabase.from("payments").update({
      status: "rejected", rejection_reason: rejectReason.trim(),
    }).eq("id", rejectingPayment.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Payment rejected");
    sendStatusEmail(rejectingPayment, "rejected", rejectReason.trim());
    setRejectingPayment(null);
    setRejectReason("");
    setSelectedPayment(null);
    fetchPayments();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground">Verify and manage payments</p>
      </div>

      <Card className="border border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by student or reference..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending_verification">Pending</SelectItem>
              <SelectItem value="verified">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Method</TableHead>
                <TableHead className="hidden lg:table-cell">Reference</TableHead>
                <TableHead className="hidden md:table-cell">Installment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
              ) : (
                filtered.map((payment) => {
                  const status = statusBadge[payment.status] || { label: payment.status, variant: "outline" as const };
                  return (
                    <TableRow key={payment.id} className={cn(highlightId === payment.id && "bg-primary/5")}>
                      <TableCell>
                        <div className="font-medium">{payment.students?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{payment.students?.email}</div>
                      </TableCell>
                      <TableCell>
                        {payment.proof_url ? (
                          <a href={payment.proof_url} target="_blank" rel="noopener noreferrer">
                            <img src={payment.proof_url} alt="proof" className="w-12 h-12 object-cover rounded border hover:ring-2 hover:ring-primary cursor-zoom-in" />
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>NPR {Number(payment.amount).toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{payment.payment_method?.replace("_", " ") || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">{payment.transaction_reference || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">#{payment.installment_number} of 2</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPayment(payment)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {payment.status === "pending_verification" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => approvePayment(payment)}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setRejectingPayment(payment); setRejectReason(""); }}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* Payment Detail Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent>
          {selectedPayment && (
            <>
              <DialogHeader><DialogTitle>Payment Details</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Student:</span><p className="font-medium">{selectedPayment.students?.full_name}</p></div>
                  <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{selectedPayment.students?.email}</p></div>
                  <div><span className="text-muted-foreground">Phone:</span><p className="font-medium">{selectedPayment.students?.phone || "—"}</p></div>
                  <div><span className="text-muted-foreground">Amount:</span><p className="font-medium">NPR {Number(selectedPayment.amount).toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Method:</span><p className="font-medium capitalize">{selectedPayment.payment_method?.replace("_", " ") || "—"}</p></div>
                  <div><span className="text-muted-foreground">Reference:</span><p className="font-medium font-mono">{selectedPayment.transaction_reference || "—"}</p></div>
                  <div><span className="text-muted-foreground">Installment:</span><p className="font-medium">#{selectedPayment.installment_number} of 2</p></div>
                  <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{selectedPayment.payment_date ? new Date(selectedPayment.payment_date).toLocaleDateString() : "—"}</p></div>
                </div>
                {selectedPayment.rejection_reason && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm">
                    <p className="text-destructive font-medium">Rejection reason</p>
                    <p>{selectedPayment.rejection_reason}</p>
                  </div>
                )}
                {selectedPayment.proof_url && (
                  <div>
                    <span className="text-muted-foreground text-sm">Payment Proof:</span>
                    <img src={selectedPayment.proof_url} alt="Payment proof" className="mt-2 rounded-lg border max-h-64 object-contain" />
                  </div>
                )}
                {selectedPayment.status === "pending_verification" && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => approvePayment(selectedPayment)}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => { setRejectingPayment(selectedPayment); setRejectReason(""); }}>
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectingPayment} onOpenChange={(open) => { if (!open) { setRejectingPayment(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The student will be emailed this reason and asked to try again.
            </p>
            <Textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Screenshot is unclear, amount doesn't match..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingPayment(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>Confirm rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
