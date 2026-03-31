import { useState } from "react";
import SectionWrapper from "./SectionWrapper";

const LeadForm = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              required
              type="email"
              placeholder="Email Address"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              required
              type="tel"
              placeholder="Phone Number"
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              required
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              defaultValue=""
            >
              <option value="" disabled>Your Background</option>
              <option>Fresher / Student</option>
              <option>Working Professional</option>
              <option>CA / ACCA Student</option>
              <option>Freelancer</option>
              <option>Entrepreneur</option>
              <option>Other</option>
            </select>
            <button
              type="submit"
              className="w-full rounded-lg px-6 py-3.5 text-base font-bold text-gold-foreground transition-opacity hover:opacity-90"
              style={{ background: "var(--gold-gradient)" }}
            >
              Submit Enquiry
            </button>
          </form>
        )}
      </div>
    </SectionWrapper>
  );
};

export default LeadForm;
