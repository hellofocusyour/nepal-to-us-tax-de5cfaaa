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
import { MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface SmsRecipient {
  name?: string | null;
  phone: string;
  inquiry_id?: string | null;
  student_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: SmsRecipient[];
  onSent?: () => void;
}

type TemplateKey = "class_starting" | "follow_up" | "payment_reminder" | "custom";

const TEMPLATES: Record<TemplateKey, { label: string; body: string }> = {
  class_starting: {
    label: "Class Starting Reminder",
    body:
      "Hi! This is Focus Academy. Your US Tax Course begins soon. Log in to your student portal for batch details. Reply STOP to opt out.",
  },
  follow_up: {
    label: "Inquiry Follow-up",
    body:
      "Hi from Focus Academy! Still interested in our US Tax Course (30 Days, taught in Neplish)? Reply YES and we'll share batch & fee details.",
  },
  payment_reminder: {
    label: "Payment Reminder",
    body:
      "Hi from Focus Academy. Friendly reminder: your course payment is pending. Please complete it to confirm your seat. Questions? Just reply.",
  },
  custom: { label: "Custom", body: "" },
};

const MAX_LEN = 320; // 2 SMS segments worth

export const SmsComposeModal = ({ open, onOpenChange, recipients, onSent }: Props) => {
  const [template, setTemplate] = useState<TemplateKey>("custom");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTemplate("custom");
      setMessage("");
    }
  }, [open]);

  const applyTemplate = (key: TemplateKey) => {
    setTemplate(key);
    setMessage(TEMPLATES[key].body);
  };

  const validRecipients = useMemo(
    () => recipients.filter((r) => r.phone && r.phone.trim().length > 0),
    [recipients],
  );
  const skipped = recipients.length - validRecipients.length;

  const toLine = useMemo(
    () =>
      validRecipients
        .map((r) => (r.name ? `${r.name} <${r.phone}>` : r.phone))
        .join(", "),
    [validRecipients],
  );

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }
    if (validRecipients.length === 0) {
      toast.error("No recipients with phone numbers");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: validRecipients,
          message: message.trim(),
        },
      });
      if (error) throw error;
      const sent = (data as { sent?: number })?.sent ?? 0;
      const failed = (data as { failed?: number })?.failed ?? 0;
      if (failed > 0) {
        toast.warning(`Sent ${sent}, ${failed} failed`);
      } else {
        toast.success(`SMS sent to ${sent} recipient${sent === 1 ? "" : "s"}`);
      }
      onSent?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(`Failed to send: ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const segments = Math.max(1, Math.ceil(message.length / 160));

  return (
    <Dialog open={open} onOpenChange={(o) => (!sending ? onOpenChange(o) : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compose SMS</DialogTitle>
          <DialogDescription>
            Sending to {validRecipients.length} recipient{validRecipients.length === 1 ? "" : "s"}
            {skipped > 0 && ` (${skipped} skipped — no phone)`}
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
            <label className="text-sm font-medium mb-1 block flex items-center justify-between">
              <span>Message</span>
              <span className="text-xs text-muted-foreground font-normal">
                {message.length}/{MAX_LEN} · {segments} SMS
              </span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              placeholder="Write your SMS..."
              rows={6}
              disabled={sending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || validRecipients.length === 0}>
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : (
              <><MessageSquare className="w-4 h-4 mr-2" /> Send SMS</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SmsComposeModal;
