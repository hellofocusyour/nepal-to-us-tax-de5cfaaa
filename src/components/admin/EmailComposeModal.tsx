import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, Mail, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export interface EmailRecipient {
  name?: string | null;
  email: string;
  inquiry_id?: string | null;
}

interface EmailComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: EmailRecipient[];
  onSent?: () => void;
}

type TemplateKey =
  | "blank"
  | "class_starting"
  | "cpa_surprise"
  | "last_chance"
  | "career"
  | "custom";

const TEMPLATES: Record<
  TemplateKey,
  { label: string; subject: string; body: string }
> = {
  blank: { label: "Select a template...", subject: "", body: "" },
  class_starting: {
    label: "Class Starting May 15",
    subject: "Your US Tax Course Starts May 15 🎓",
    body: `Hi [Name],

We noticed you reached out about the US Tax Course at Focus Academy. Our next batch starts May 15 and we'd love to have you join — only a few seats remain.

What you get in 30 days:
- Trained by an EA (Enrolled Agent) — the highest IRS-recognized credential
- Live classes in Neplish (Nepali + English) — no language barrier
- Hands-on practice with real US tax forms: 1040, W-2, 1099
- Career guidance and support after the course ends

Reply to this email if you have any questions about fees, schedule, or what to expect and we'll get back to you quickly.

— Focus Academy Team
academy.focusyourfinance.com`,
  },
  cpa_surprise: {
    label: "CPA Surprise (Facebook Leads)",
    subject: "We've got a surprise lined up for you 👀",
    body: `Hi [Name],

You showed interest in our US Tax Course through Facebook — and we're glad you did, because the May 15 batch has something no other Nepali tax course offers.

We've arranged surprise live sessions with a CPA from the USA.

Real American tax professionals joining live to share how US tax filing works from the inside — the cases, the edge scenarios, the things textbooks won't tell you. These sessions are only announced to enrolled students.

Here's what you get in 30 days:
- Trained by an EA (Enrolled Agent) — the highest IRS-recognized credential
- Live classes in Neplish (Nepali + English) — no language barrier
- Hands-on practice with real US tax forms: 1040, W-2, 1099
- Surprise live sessions with a CPA from the USA
- Career guidance and support after the course ends

Classes begin May 15. Seats are limited because we keep batches small to give every student personal attention. Once it's full, registration closes.

Have a question before enrolling? Just reply to this email — we respond quickly.

— Focus Academy Team
academy.focusyourfinance.com`,
  },
  last_chance: {
    label: "Last Chance — Closes May 14",
    subject: "4 days left — US Tax Course enrollment closes May 14",
    body: `Hi [Name],

You reached out about the US Tax Course on Facebook. We don't want you to miss this — so here's the honest picture.

Enrollment closes May 14. Classes start May 15. After that, the next batch date is TBD.

This batch is taught by a certified Enrolled Agent (EA) — the highest credential recognized by the IRS — and includes exclusive live sessions with a CPA from the USA that only enrolled students get access to.

What's included:
- Taught in Neplish — easy to follow, nothing lost in translation
- Real US tax forms: 1040, W-2, 1099 — hands-on practice every session
- Small batch size — personal attention, not a crowded classroom
- Career support after the course — we don't just teach and leave

You have 4 days to decide. After May 14, registration is closed.

Reply to this email with any questions and we'll get back to you today.

— Focus Academy Team
academy.focusyourfinance.com`,
  },
  career: {
    label: "Career Opportunity",
    subject: "US tax skills = real jobs. Here's how to get there.",
    body: `Hi [Name],

You connected with us on Facebook. Here's why we think this course could genuinely change your career path.

Thousands of US-based Nepali families and businesses need someone who understands US taxes and speaks their language. Right now, almost no one fills that gap. This course makes you that person.

Who teaches you matters. Ours:
- Lead mentor: Enrolled Agent (EA) — IRS-recognized credential, not just a certificate
- Surprise sessions: Live classes with a CPA from the USA — real-world filings, real stories

In 30 days you'll be able to:
- Prepare and file 1040, W-2, and 1099 forms with confidence
- Understand how the US tax system actually works — not just theory
- Position yourself for remote tax prep jobs and freelance opportunities

Classes are in Neplish (Nepali + English), start May 15, and batch size is intentionally small.

Reply anytime with questions — we're happy to walk you through what to expect before you enroll.

— Focus Academy Team
academy.focusyourfinance.com`,
  },
  custom: { label: "Custom Message", subject: "", body: "" },
};

const TEMPLATE_ORDER: TemplateKey[] = [
  "blank",
  "class_starting",
  "cpa_surprise",
  "last_chance",
  "career",
  "custom",
];

const SITE_URL = "https://academy.focusyourfinance.com";

export const EmailComposeModal = ({
  open,
  onOpenChange,
  recipients,
  onSent,
}: EmailComposeModalProps) => {
  const [template, setTemplate] = useState<TemplateKey>("blank");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Reserve My Seat →");
  const [ctaUrl, setCtaUrl] = useState(SITE_URL);
  const [includeCta, setIncludeCta] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setTemplate("blank");
      setSubject("");
      setBody("");
      setCtaLabel("Reserve My Seat →");
      setCtaUrl(SITE_URL);
      setIncludeCta(true);
      setShowPreview(false);
    }
  }, [open]);

  const applyTemplate = (key: TemplateKey) => {
    setTemplate(key);
    const t = TEMPLATES[key];
    setSubject(t.subject);
    setBody(t.body);
  };

  const canSend = useMemo(
    () => subject.trim().length > 0 && body.trim().length > 0 && recipients.length > 0,
    [subject, body, recipients.length]
  );

  const personalize = (text: string, name?: string | null) => {
    const full = (name ?? "").trim();
    const first = full.split(/\s+/)[0] || "there";
    const safeFull = full || first;
    return text
      .replace(/\[\s*first[\s_-]*name\s*\]/gi, first)
      .replace(/\{\{?\s*first[\s_-]*name\s*\}?\}/gi, first)
      .replace(/\[\s*full[\s_-]*name\s*\]/gi, safeFull)
      .replace(/\{\{?\s*full[\s_-]*name\s*\}?\}/gi, safeFull)
      .replace(/\[\s*name\s*\]/gi, first)
      .replace(/\{\{?\s*name\s*\}?\}/gi, first);
  };

  const previewRecipient = recipients[0];
  const previewBodyHtml = useMemo(() => {
    const text = personalize(body, previewRecipient?.name);
    return text
      .split(/\n/)
      .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
      .join("<br/>");
  }, [body, previewRecipient?.name]);
  const previewSubject = useMemo(
    () => personalize(subject, previewRecipient?.name),
    [subject, previewRecipient?.name]
  );

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: recipients,
          subject,
          body,
          cta_label: includeCta ? ctaLabel : null,
          cta_url: includeCta ? ctaUrl : null,
        },
      });
      if (error) throw error;
      const failed = (data as { failed?: number })?.failed ?? 0;
      if (failed > 0 && failed === recipients.length) {
        toast.error("✗ Failed to send. Please try again.");
        return;
      }
      toast.success("✓ Email sent successfully!", { duration: 3000 });
      onSent?.();
      onOpenChange(false);
    } catch {
      toast.error("✗ Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={() => !sending && onOpenChange(false)}
    >
      <div
        className="w-full max-h-[92vh] overflow-hidden flex flex-col"
        style={{
          maxWidth: 680,
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "#0c4a6e",
            borderRadius: "16px 16px 0 0",
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 22,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              F
            </div>
            <div>
              <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                Compose Email
              </div>
              <div style={{ color: "#93c5fd", fontSize: 12, marginTop: 2 }}>
                Focus Academy
              </div>
            </div>
          </div>
          <button
            onClick={() => !sending && onOpenChange(false)}
            disabled={sending}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: sending ? "not-allowed" : "pointer",
              padding: 6,
              borderRadius: 8,
              opacity: sending ? 0.5 : 1,
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 32px", overflowY: "auto", flex: 1 }}>
          {/* To field */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#64748b", fontSize: 13, display: "block", marginBottom: 6 }}>
              To
            </label>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                maxHeight: 110,
                overflowY: "auto",
              }}
            >
              {recipients.length === 0 ? (
                <span style={{ color: "#94a3b8", fontSize: 13 }}>No recipients</span>
              ) : (
                recipients.map((r, i) => (
                  <span
                    key={`${r.email}-${i}`}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #0c4a6e",
                      color: "#0c4a6e",
                      borderRadius: 20,
                      padding: "4px 12px",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.name ? `${r.name} — ${r.email}` : r.email}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Template */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#64748b", fontSize: 13, display: "block", marginBottom: 6 }}>
              Template
            </label>
            <select
              value={template}
              onChange={(e) => applyTemplate(e.target.value as TemplateKey)}
              disabled={sending}
              className="focus:outline-none"
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 14,
                background: "#ffffff",
                color: "#0f172a",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0c4a6e")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
            >
              {TEMPLATE_ORDER.map((k) => (
                <option key={k} value={k}>
                  {TEMPLATES[k].label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#64748b", fontSize: 13, display: "block", marginBottom: 6 }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={sending}
              className="focus:outline-none"
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 14,
                color: "#0f172a",
                background: "#ffffff",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0c4a6e")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ color: "#64748b", fontSize: 13, display: "block", marginBottom: 6 }}>
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message... (use [Name] to personalize)"
              rows={10}
              disabled={sending}
              className="focus:outline-none"
              style={{
                width: "100%",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 14,
                lineHeight: 1.7,
                color: "#0f172a",
                background: "#ffffff",
                resize: "vertical",
                minHeight: 220,
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0c4a6e")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
            />
            <div
              style={{
                color: "#94a3b8",
                fontSize: 12,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {body.length} characters
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #e2e8f0",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            Sent emails are logged in Email History
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => onOpenChange(false)}
              disabled={sending}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#475569",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend || sending}
              style={{
                background: "#0c4a6e",
                border: "none",
                color: "#ffffff",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 600,
                cursor: !canSend || sending ? "not-allowed" : "pointer",
                opacity: !canSend || sending ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                minWidth: 140,
                justifyContent: "center",
              }}
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailComposeModal;
