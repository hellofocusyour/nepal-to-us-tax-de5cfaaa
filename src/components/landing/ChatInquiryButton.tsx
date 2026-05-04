import { useState } from "react";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ChatInquiryButton = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      message: form.message.trim(),
      background: form.message.trim(),
    });
    setLoading(false);
    if (error) {
      toast.error("Could not send. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  const reset = () => {
    setSubmitted(false);
    setForm({ full_name: "", email: "", phone: "", message: "" });
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 bg-primary text-primary-foreground"
        aria-label="Open chat"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-44 right-6 z-50 w-[90vw] max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="px-4 py-3 bg-primary text-primary-foreground">
            <p className="font-semibold text-sm">Chat with us</p>
            <p className="text-xs opacity-90">We typically reply within a few hours</p>
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            {submitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="text-3xl">✅</div>
                <p className="text-sm text-foreground font-medium">
                  Thank you for messaging us. Our contact team will review your inquiry and get back to you soon.
                </p>
                <button
                  onClick={reset}
                  className="text-xs text-primary underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-muted p-3 text-sm text-foreground">
                  Hi! Thanks for reaching out. Please share your details and our team will contact you shortly.
                </div>
                <form onSubmit={handleSubmit} className="space-y-2">
                  <input
                    required
                    type="text"
                    placeholder="Name"
                    value={form.full_name}
                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Phone"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <textarea
                    required
                    placeholder="Message / Question"
                    rows={3}
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-primary-foreground bg-primary hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatInquiryButton;
