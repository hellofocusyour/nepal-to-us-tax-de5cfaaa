import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SectionWrapper from "./SectionWrapper";
import { toast } from "sonner";

const LeadForm = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", background: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setLoading(true);

    const normalizedEmail = form.email.trim().toLowerCase();

    // Pre-check for existing email in inquiries or students
    const [{ data: existingInquiry }, { data: existingStudent }] = await Promise.all([
      supabase.from("inquiries").select("id").eq("email", normalizedEmail).maybeSingle(),
      supabase.from("students").select("id").eq("email", normalizedEmail).maybeSingle(),
    ]);

    if (existingInquiry || existingStudent) {
      setEmailError("This email is already registered — please sign in instead.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.functions.invoke("enroll-and-invite", {
      body: {
        full_name: form.full_name,
        email: normalizedEmail,
        phone: form.phone || null,
        background: form.background || null,
        redirect_to: `https://academy.focusyourfinance.com/portal?onboarding=1`,
      },
    });
    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() || "";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
        setEmailError("This email is already registered — please sign in instead.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
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
            <p className="font-display text-xl font-bold text-foreground mb-2">🎉 Check your email!</p>
            <p className="text-sm text-muted-foreground">We've sent you a magic sign-in link. Click it to access your portal and complete your booking.</p>
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
            <div>
              <input
                required
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={e => { setForm(p => ({ ...p, email: e.target.value })); if (emailError) setEmailError(null); }}
                aria-invalid={!!emailError}
                className={`w-full rounded-lg border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${emailError ? "border-destructive" : "border-border"}`}
              />
              {emailError && (
                <p className="mt-1.5 text-xs text-destructive">
                  {emailError}{" "}
                  <Link to="/login" className="underline font-semibold">Sign in</Link>
                </p>
              )}
            </div>
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
