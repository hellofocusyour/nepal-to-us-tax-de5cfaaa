import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Upload, Copy, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentId: string | null;
  defaultAmount?: number;
  defaultInstallment?: number;
  onSubmitted?: () => void;
}

const BANK_DETAILS = {
  bank: "Nabil Bank",
  account: "8123-4567-8901",
  name: "Focus Academy Pvt. Ltd.",
};

const QR_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
      <rect width='160' height='160' fill='white'/>
      <g fill='black'>
        ${Array.from({ length: 100 })
          .map(() => {
            const x = Math.floor(Math.random() * 16) * 10;
            const y = Math.floor(Math.random() * 16) * 10;
            return `<rect x='${x}' y='${y}' width='10' height='10'/>`;
          })
          .join("")}
        <rect x='0' y='0' width='40' height='40' fill='white' stroke='black' stroke-width='4'/>
        <rect x='10' y='10' width='20' height='20' fill='black'/>
        <rect x='120' y='0' width='40' height='40' fill='white' stroke='black' stroke-width='4'/>
        <rect x='130' y='10' width='20' height='20' fill='black'/>
        <rect x='0' y='120' width='40' height='40' fill='white' stroke='black' stroke-width='4'/>
        <rect x='10' y='130' width='20' height='20' fill='black'/>
      </g>
    </svg>`
  );

const generateRefId = () =>
  `FA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;

const PaymentModal = ({ open, onOpenChange, studentId, defaultAmount, defaultInstallment, onSubmitted }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(defaultAmount?.toString() || "8000");
  const [installment, setInstallment] = useState(defaultInstallment?.toString() || "1");
  const [plan, setPlan] = useState("3_installments");
  const [method, setMethod] = useState<"bank_transfer" | "fonepay" | "ips">("fonepay");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refId, setRefId] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setAmount(defaultAmount?.toString() || "8000");
      setInstallment(defaultInstallment?.toString() || "1");
      setProofFile(null);
      setRefId("");
    }
  }, [open, defaultAmount, defaultInstallment]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const handleSubmit = async () => {
    if (!studentId || !proofFile) return;
    setSubmitting(true);
    try {
      const ext = proofFile.name.split(".").pop();
      const path = `${studentId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(path);

      const newRef = generateRefId();
      const { error } = await supabase.from("payments").insert({
        student_id: studentId,
        amount: parseFloat(amount),
        payment_method: method,
        transaction_reference: newRef,
        installment_number: parseInt(installment),
        proof_url: urlData.publicUrl,
        payment_date: new Date().toISOString(),
      });
      if (error) throw error;

      setRefId(newRef);
      setStep(3);
      onSubmitted?.();
    } catch (err: unknown) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const Stepper = () => (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6">
      {[1, 2, 3].map((n, i) => (
        <div key={n} className="flex items-center gap-2 sm:gap-4">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                step > n
                  ? "bg-primary text-primary-foreground"
                  : step === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground border border-border"
              )}
            >
              {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={cn("text-xs hidden sm:block", step >= n ? "text-foreground" : "text-muted-foreground")}>
              {["Booking", "Payment", "Confirm"][n - 1]}
            </span>
          </div>
          {i < 2 && <div className={cn("w-8 sm:w-12 h-0.5", step > n ? "bg-primary" : "bg-border")} />}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Make a payment</DialogTitle>
        </DialogHeader>
        <Stepper />

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Step 1 — Book your course</h3>
              <p className="text-sm text-muted-foreground">Confirm details and amount due</p>
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Course</span>
                <span className="font-medium">US Taxation Course</span>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full payment</SelectItem>
                    <SelectItem value="2_installments">2 installments</SelectItem>
                    <SelectItem value="3_installments">3 installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Installment</Label>
                  <Select value={installment} onValueChange={setInstallment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st</SelectItem>
                      <SelectItem value="2">2nd</SelectItem>
                      <SelectItem value="3">3rd</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount due (Rs.)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!amount}>Continue → Pay</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">Step 2 — Pay & upload proof</h3>
              <p className="text-sm text-muted-foreground">
                Scan the QR or transfer to bank, then upload screenshot.
              </p>
              <p className="text-lg font-bold text-primary mt-2">Rs. {Number(amount).toLocaleString()}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4 flex flex-col items-center bg-card">
                <img src={QR_PLACEHOLDER} alt="QR code" className="w-32 h-32" />
                <p className="text-xs text-muted-foreground mt-2">Scan with eSewa / Khalti / FonePay</p>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2 bg-card">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Or bank transfer</p>
                {[
                  { k: "Bank", v: BANK_DETAILS.bank },
                  { k: "Account", v: BANK_DETAILS.account, mono: true },
                  { k: "Name", v: BANK_DETAILS.name },
                ].map((row) => (
                  <div key={row.k} className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground">{row.k}</span>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className={cn("font-medium truncate", row.mono && "font-mono")}>{row.v}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copy(row.v, row.k)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment method used</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fonepay">QR — FonePay / eSewa / Khalti</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="ips">IPS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload payment screenshot</Label>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-1">
                  {proofFile ? proofFile.name : "PNG, JPG up to 5 MB"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={!proofFile || submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit for review
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-foreground">Confirmation sent</h3>
              <p className="text-sm text-muted-foreground">Admin will verify your payment within 24 hours.</p>
            </div>
            <div className="rounded-lg border border-border p-4 text-left space-y-2 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference ID</span>
                <span className="font-mono font-medium">{refId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">Rs. {Number(amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pending verification</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You'll get an email once admin approves — usually within 24 hrs.
            </p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
