import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SectionWrapper from "./SectionWrapper";
import { toast } from "sonner";

const LeadForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", background: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      background: form.background || null,
    });
    if (error) {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <SectionWrapper id="enroll">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Reserve Your Spot</h2>
          <p className="text-sm text-muted-foreground">Fill in your details and we'll get in touch within 24 hours.</p>
        </div>
        {submitted ? (
          <div className="rounded-xl bg-accent p-8 text-center">
            <p className="font-display text-xl font-bold text-foreground mb-2">🎉 Thank you!</p>
            <p className="text-sm text-muted-foreground">We've received your enquiry. Our team will contact you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              type="text"
              placeholder="Full Name"
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              required
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              required
              type="tel"
              placeholder="Phone Number"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              required
              value={form.background}
              onChange={e => setForm(p => ({ ...p, background: e.target.value }))}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>Your Background</option>
              <option value="fresher">Fresher / Student</option>
              <option value="professional">Working Professional</option>
              <option value="ca">CA / ACCA Student</option>
              <option value="freelancer">Freelancer</option>
              <option value="entrepreneur">Entrepreneur</option>
              <option value="other">Other</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-6 py-3.5 text-base font-bold text-gold-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--gold-gradient)" }}
            >
              {loading ? "Submitting..." : "Submit Enquiry"}
            </button>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
};

export default LeadForm;
