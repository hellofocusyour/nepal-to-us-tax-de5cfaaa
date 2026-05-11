import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Loader2 } from "lucide-react";
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

type TemplateKey = "class_starting" | "follow_up" | "custom";

const TEMPLATES: Record<TemplateKey, { label: string; subject: string; body: string }> = {
  class_starting: {
    label: "Class Starting May 15",
    subject: "Your US Tax Course Starts May 15 🎓",
    body:
      "Hi there,\n\n" +
      "Quick reminder — your US Tax Course at Focus Academy kicks off on May 15. " +
      "Sessions are taught in Neplish (Nepali + English) by mentors who've worked on real US tax filings.\n\n" +
      "What to do before day 1:\n" +
      "• Log in to your student portal and check your batch details\n" +
      "• Make sure your laptop has a stable internet connection\n" +
      "• Keep a notebook handy for the first walkthrough\n\n" +
      "If you have any questions before we start, just reply to this email.\n\n" +
      "See you on the 15th!\n— Focus Academy",
  },
  follow_up: {
    label: "Follow-up Inquiry",
    subject: "Still interested in the US Tax Course?",
    body:
      "Hi there,\n\n" +
      "We noticed you reached out about the US Tax Course at Focus Academy but haven't enrolled yet. " +
      "We wanted to check in and see if you had any questions we can help answer.\n\n" +
      "A few things worth knowing:\n" +
      "• 30 Days of structured training in Neplish\n" +
      "• Real US tax forms (1040, W-2, 1099) and live practice\n" +
      "• Career Breakthroughs support after the course\n\n" +
      "Reply to this email and we'll get you sorted with the next batch details, fee plans, " +
      "or anything else you need.\n\n" +
      "— Focus Academy",
  },
  custom: { label: "Custom", subject: "", body: "" },
};

export const EmailComposeModal = ({
  open, onOpenChange, recipients, onSent,
}: EmailComposeModalProps) => {
  const [template, setTemplate] = useState<TemplateKey>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Enroll Now");
  const [ctaUrl, setCtaUrl] = useState("https://academy.focusyourfinance.com");
  const [includeCta, setIncludeCta] = useState(true);
  const [sending, setSending] = useState(false);

  // Reset to Custom on every open.
  useEffect(() => {
    if (open) {
      setTemplate("custom");
      setSubject("");
      setBody("");
      setCtaLabel("Enroll Now");
      setCtaUrl("https://academy.focusyourfinance.com");
      setIncludeCta(true);
    }
  }, [open]);

  const applyTemplate = (key: TemplateKey) => {
    setTemplate(key);
    const t = TEMPLATES[key];
    setSubject(t.subject);
    setBody(t.body);
  };

  const toLine = useMemo(
    () =>
      recipients
        .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
        .join(", "),
    [recipients]
  );

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (recipients.length === 0) {
      toast.error("No recipients selected");
      return;
    }
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
      const sent = (data as { sent?: number })?.sent ?? recipients.length;
      if (failed > 0) {
        toast.warning(`Sent ${sent}, ${failed} failed`);
      } else {
        toast.success(`Email sent to ${sent} recipient${sent === 1 ? "" : "s"}`);
      }
      onSent?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(`Failed to send: ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!sending ? onOpenChange(o) : null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription>
            Sending to {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">To</label>
            <Input value={toLine} readOnly className="bg-muted" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Template</label>
            <Select value={template} onValueChange={(v) => applyTemplate(v as TemplateKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => (
                  <SelectItem key={key} value={key}>{TEMPLATES[key].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              disabled={sending}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Message</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={10}
              disabled={sending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" /> Send</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposeModal;
