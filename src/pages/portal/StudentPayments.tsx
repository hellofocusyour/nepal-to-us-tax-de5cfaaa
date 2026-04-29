import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Plus, Search, FileText, Eye, Download } from "lucide-react";
import PaymentModal from "@/components/student/PaymentModal";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { FULL_PRICE, INSTALLMENT_TOTAL, INSTALLMENT_AMOUNT, type PaymentPlan } from "@/lib/pricing";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];

const statusConfig: Record<string, { label: string; className: string }> = {
  pending_verification: { label: "Pending", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  verified: { label: "Approved", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive hover:bg-destructive/10" },
};

const methodLabel = (m: string | null) => {
  if (m === "fonepay") return "QR — FonePay";
  if (m === "bank_transfer") return "Bank transfer";
  if (m === "ips") return "IPS";
  return "—";
};

const StudentPayments = () => {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const fetchPayments = async (sid: string) => {
    const { data } = await supabase.from("payments").select("*")
      .eq("student_id", sid).order("created_at", { ascending: false });
    if (data) setPayments(data);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: student } = await supabase.from("students")
        .select("id").eq("user_id", user.id).maybeSingle();
      if (student) {
        setStudentId(student.id);
        await fetchPayments(student.id);
      }
      setLoading(false);
    })();
  }, [user]);

  const verified = payments.filter(p => p.status === "verified")
    .reduce((s, p) => s + Number(p.amount), 0);
  const remaining = Math.max(TOTAL_FEE - verified, 0);
  const paidPct = Math.min(Math.round((verified / TOTAL_FEE) * 100), 100);

  const filtered = payments.filter(p => {
    if (filter === "pending" && p.status !== "pending_verification") return false;
    if (filter === "approved" && p.status !== "verified") return false;
    if (filter === "rejected" && p.status !== "rejected") return false;
    if (search && !(p.transaction_reference || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: payments.length,
    pending: payments.filter(p => p.status === "pending_verification").length,
    approved: payments.filter(p => p.status === "verified").length,
    rejected: payments.filter(p => p.status === "rejected").length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Track your fees and submit installments</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!studentId || remaining === 0}>
          <Plus className="w-4 h-4 mr-2" /> Make a payment
        </Button>
      </div>

      {/* 3 fee summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total course fee</p>
            <p className="text-2xl font-display font-bold text-foreground">Rs. {TOTAL_FEE.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Paid so far</p>
            <p className="text-2xl font-display font-bold text-primary">Rs. {verified.toLocaleString()}</p>
            <Progress value={paidPct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">{paidPct}% paid</p>
          </CardContent>
        </Card>
        {remaining === 0 ? (
          <Card className="border-green-500/40 bg-green-50">
            <CardContent className="pt-6 space-y-1">
              <p className="text-xs text-green-700 uppercase tracking-wide">All clear</p>
              <p className="text-lg font-display font-bold text-green-700">Paid in full — thank you!</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-destructive/40">
            <CardContent className="pt-6 space-y-1">
              <p className="text-xs text-destructive uppercase tracking-wide">Next due</p>
              <p className="text-2xl font-display font-bold text-destructive">Rs. {remaining.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Due soon</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filter + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f} {counts[f] > 0 && `(${counts[f]})`}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference ID" className="pl-9" />
        </div>
      </div>

      {/* History */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {payments.length === 0
                ? "No payments yet — click 'Make a payment' to book your first installment."
                : "No payments match your filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Reference</th>
                  <th className="text-left px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Method</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const cfg = statusConfig[p.status] || statusConfig.pending_verification;
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{p.transaction_reference || "—"}</td>
                      <td className="px-4 py-3 font-semibold">Rs. {Number(p.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{methodLabel(p.payment_method)}</td>
                      <td className="px-4 py-3"><Badge className={cfg.className}>{cfg.label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        {p.proof_url && p.status === "pending_verification" && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={p.proof_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        {p.status === "verified" && p.receipt_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={p.receipt_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-1" /> Receipt
                            </a>
                          </Button>
                        )}
                        {p.status === "rejected" && (
                          <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
                            Try again
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <PaymentModal open={open} onOpenChange={setOpen} studentId={studentId} onSubmitted={() => studentId && fetchPayments(studentId)} />
    </div>
  );
};

export default StudentPayments;
