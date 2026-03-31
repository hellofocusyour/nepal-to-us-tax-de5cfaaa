import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface PaymentWithStudent {
  id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  installment_number: number;
  status: string;
  payment_date: string | null;
  proof_url: string | null;
  created_at: string;
  students: { full_name: string; email: string } | null;
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_verification: { label: "Pending", variant: "outline" },
  verified: { label: "Verified", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  overdue: { label: "Overdue", variant: "destructive" },
};

const Payments = () => {
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithStudent | null>(null);

  const fetchPayments = async () => {
    let query = supabase
      .from("payments")
      .select("*, students(full_name, email)")
      .order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter as "pending_verification" | "verified" | "rejected" | "overdue");
    const { data } = await query;
    setPayments((data as unknown as PaymentWithStudent[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, [statusFilter]);

  const filtered = payments.filter(p =>
    p.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.transaction_reference?.toLowerCase().includes(search.toLowerCase())
  );

  const updatePaymentStatus = async (paymentId: string, status: string) => {
    const { error } = await supabase.from("payments").update({ status: status as "pending_verification" | "verified" | "rejected" | "overdue" }).eq("id", paymentId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Payment ${status === "verified" ? "verified" : "rejected"}`);
    fetchPayments();
    setSelectedPayment(null);
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
              <SelectItem value="verified">Verified</SelectItem>
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
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
              ) : (
                filtered.map((payment) => {
                  const status = statusBadge[payment.status] || { label: payment.status, variant: "outline" as const };
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.students?.full_name || "—"}</TableCell>
                      <TableCell>NPR {Number(payment.amount).toLocaleString()}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{payment.payment_method?.replace("_", " ") || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{payment.transaction_reference || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">#{payment.installment_number}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPayment(payment)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {payment.status === "pending_verification" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => updatePaymentStatus(payment.id, "verified")}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => updatePaymentStatus(payment.id, "rejected")}>
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
                  <div><span className="text-muted-foreground">Amount:</span><p className="font-medium">NPR {Number(selectedPayment.amount).toLocaleString()}</p></div>
                  <div><span className="text-muted-foreground">Method:</span><p className="font-medium capitalize">{selectedPayment.payment_method?.replace("_", " ") || "—"}</p></div>
                  <div><span className="text-muted-foreground">Reference:</span><p className="font-medium">{selectedPayment.transaction_reference || "—"}</p></div>
                  <div><span className="text-muted-foreground">Installment:</span><p className="font-medium">#{selectedPayment.installment_number}</p></div>
                  <div><span className="text-muted-foreground">Date:</span><p className="font-medium">{selectedPayment.payment_date ? new Date(selectedPayment.payment_date).toLocaleDateString() : "—"}</p></div>
                </div>
                {selectedPayment.proof_url && (
                  <div>
                    <span className="text-muted-foreground text-sm">Payment Proof:</span>
                    <img src={selectedPayment.proof_url} alt="Payment proof" className="mt-2 rounded-lg border max-h-64 object-contain" />
                  </div>
                )}
                {selectedPayment.status === "pending_verification" && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => updatePaymentStatus(selectedPayment.id, "verified")}>
                      <CheckCircle className="w-4 h-4 mr-2" /> Verify
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => updatePaymentStatus(selectedPayment.id, "rejected")}>
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
