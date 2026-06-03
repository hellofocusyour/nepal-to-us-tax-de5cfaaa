import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BASE_PRICE, VAT_AMOUNT, INSTALLMENT_SURCHARGE, expectedTotal,
} from "@/lib/pricing";

export interface InvoicePayment {
  id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  status: string;
  payment_date: string | null;
  created_at: string;
}

export interface InvoiceStudent {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: InvoiceStudent | null;
  plan: "full" | "installment";
  payments: InvoicePayment[];
  totalPaid: number;
}

const SUPPORT_EMAIL = "academy@focusyourfinance.com";
const SUPPORT_PHONE = "+977 970-9139754";

const fmt = (n: number) => `NPR ${Number(n).toLocaleString()}`;
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const invoiceNumberFor = (studentId: string) => {
  // Stable per-student invoice number derived from id.
  const hex = studentId.replace(/[^a-f0-9]/gi, "").slice(0, 6).toUpperCase().padEnd(6, "0");
  const year = new Date().getFullYear();
  return `INV-${year}-${hex}`;
};

const InvoiceDialog = ({ open, onOpenChange, student, plan, payments, totalPaid }: Props) => {
  const [emailing, setEmailing] = useState(false);

  const data = useMemo(() => {
    if (!student) return null;
    const expected = expectedTotal(plan);
    const balance = Math.max(0, expected - totalPaid);
    const status =
      totalPaid >= expected ? "Fully Paid" :
      totalPaid > 0 ? "Partially Paid" : "Unpaid";
    return {
      invoiceNo: invoiceNumberFor(student.id),
      issueDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      expected, balance, status,
    };
  }, [student, plan, totalPaid]);

  const buildHtml = () => {
    if (!student || !data) return "";
    const rows = payments
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((p) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${fmtDate(p.payment_date || p.created_at)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;">${p.transaction_reference || "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${(p.payment_method || "—").replace(/_/g, " ")}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(Number(p.amount))}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${p.status.replace(/_/g, " ")}</td>
        </tr>`).join("");

    return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;max-width:760px;margin:0 auto;padding:32px;background:#fff;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0c4a6e;padding-bottom:18px;margin-bottom:24px;">
    <div>
      <div style="font-size:24px;font-weight:700;color:#0c4a6e;">Focus Academy</div>
      <div style="font-size:13px;color:#475569;margin-top:4px;">Bridging Nepal to US Tax Careers</div>
      <div style="font-size:12px;color:#64748b;margin-top:10px;line-height:1.6;">
        ${SUPPORT_EMAIL}<br/>
        ${SUPPORT_PHONE}<br/>
        academy.focusyourfinance.com
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:20px;font-weight:700;color:#0c4a6e;letter-spacing:1px;">INVOICE</div>
      <div style="font-size:13px;color:#475569;margin-top:6px;"># ${data.invoiceNo}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">Issued: ${data.issueDate}</div>
    </div>
  </div>

  <div style="margin-bottom:24px;">
    <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
    <div style="font-size:15px;font-weight:600;">${student.full_name}</div>
    <div style="font-size:13px;color:#475569;">${student.email}</div>
    ${student.phone ? `<div style="font-size:13px;color:#475569;">${student.phone}</div>` : ""}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="text-align:left;padding:10px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Description</th>
        <th style="text-align:right;padding:10px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;">Course Fee — Stock Market Pro</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(BASE_PRICE)}</td></tr>
      <tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;">VAT (13%)</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(VAT_AMOUNT)}</td></tr>
      ${plan === "installment" ? `<tr><td style="padding:10px;border-bottom:1px solid #e5e7eb;">Installment Fee</td><td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(INSTALLMENT_SURCHARGE)}</td></tr>` : ""}
      <tr style="background:#f8fafc;">
        <td style="padding:12px 10px;font-weight:700;">Total Expected</td>
        <td style="padding:12px 10px;text-align:right;font-weight:700;">${fmt(data.expected)}</td>
      </tr>
    </tbody>
  </table>

  <div style="font-size:13px;font-weight:600;color:#0c4a6e;margin-bottom:8px;">Payments Received</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="text-align:left;padding:8px;font-size:11px;color:#475569;text-transform:uppercase;">Date</th>
        <th style="text-align:left;padding:8px;font-size:11px;color:#475569;text-transform:uppercase;">Reference</th>
        <th style="text-align:left;padding:8px;font-size:11px;color:#475569;text-transform:uppercase;">Method</th>
        <th style="text-align:right;padding:8px;font-size:11px;color:#475569;text-transform:uppercase;">Amount</th>
        <th style="text-align:left;padding:8px;font-size:11px;color:#475569;text-transform:uppercase;">Status</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="5" style="padding:14px;text-align:center;color:#94a3b8;">No payments recorded</td></tr>`}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:30px;">
    <table style="font-size:14px;min-width:280px;">
      <tr><td style="padding:6px 12px;color:#475569;">Total Expected</td><td style="padding:6px 0;text-align:right;font-weight:600;">${fmt(data.expected)}</td></tr>
      <tr><td style="padding:6px 12px;color:#475569;">Amount Paid</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#059669;">${fmt(totalPaid)}</td></tr>
      <tr style="border-top:2px solid #0c4a6e;"><td style="padding:10px 12px;font-weight:700;">Balance Due</td><td style="padding:10px 0;text-align:right;font-weight:700;color:${data.balance > 0 ? "#dc2626" : "#059669"};">${fmt(data.balance)}</td></tr>
      <tr><td style="padding:6px 12px;color:#475569;">Status</td><td style="padding:6px 0;text-align:right;font-weight:600;">${data.status}</td></tr>
    </table>
  </div>

  <div style="border-top:1px solid #e5e7eb;padding-top:18px;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
    Thank you for choosing Focus Academy. For any questions about this invoice, contact us at ${SUPPORT_EMAIL}.
  </div>
</div>`;
  };

  const handleDownload = () => {
    const html = buildHtml();
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) { toast.error("Pop-up blocked. Allow pop-ups and try again."); return; }
    win.document.write(`<!doctype html><html><head><title>${data?.invoiceNo || "Invoice"}</title>
      <style>@media print { body { margin: 0; } } body { background:#fff; margin:0; }</style>
      </head><body>${html}
      <script>window.onload = () => { window.print(); };</script>
      </body></html>`);
    win.document.close();
  };

  const handleEmail = async () => {
    if (!student) return;
    setEmailing(true);
    try {
      const html = buildHtml();
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: [{ name: student.full_name, email: student.email }],
          subject: `Invoice ${data?.invoiceNo} — Focus Academy`,
          body: html,
        },
      });
      if (error) throw error;
      toast.success(`Invoice emailed to ${student.email}`);
    } catch (e) {
      toast.error("Failed to send invoice email");
      console.error(e);
    } finally {
      setEmailing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Invoice Preview</DialogTitle></DialogHeader>
        {student && data && (
          <div
            className="border border-border rounded-md bg-white"
            dangerouslySetInnerHTML={{ __html: buildHtml() }}
          />
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleEmail} disabled={emailing || !student}>
            {emailing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Email to student
          </Button>
          <Button onClick={handleDownload} disabled={!student}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
