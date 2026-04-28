import { Check, MessageCircle, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LeadCaptureForm from "./LeadForm";

const includes = [
  "Live Interactive Classes",
  "Recorded Videos for Revision",
  "Comprehensive Notes & Materials",
  "Completion Certificate",
  "WhatsApp Community Access",
  "Sunday Q&A Support Sessions",
  "Priority Job Referral",
];

const Pricing = () => (
  <SectionWrapper id="pricing">
    <div className="text-center mb-12">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Invest in Your Future</h2>
      <p className="text-muted-foreground max-w-xl mx-auto">
        Your first month's salary covers the course fee - and then some.
      </p>
    </div>
    <div className="max-w-lg mx-auto rounded-2xl border-2 border-secondary bg-card card-shadow overflow-hidden">
      <div className="p-8 text-center" style={{ background: "var(--gold-gradient)" }}>
        <p className="text-sm font-bold text-gold-foreground/80 uppercase tracking-wider mb-2">Course Fee</p>
        <p className="font-display text-5xl font-extrabold text-gold-foreground">NPR 20,000</p>
        <p className="text-sm text-gold-foreground/80 mt-1">+ VAT</p>
      </div>
      <div className="p-8">
        <div className="bg-gold-light rounded-lg p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-foreground">💳 Installment Option Available</p>
          <p className="text-xs text-muted-foreground mt-1">2 installments (NPR 500 additional)</p>
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">What's Included</p>
        <ul className="space-y-3 mb-8">
          {includes.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-foreground">
              <Check size={18} className="text-primary shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center w-full rounded-lg px-6 py-3.5 text-base font-bold text-gold-foreground transition-opacity hover:opacity-90"
              style={{ background: "var(--gold-gradient)" }}
            >
              Secure Your Seat
            </button>
          </DialogTrigger>

          <DialogContent className="overflow-hidden border-0 p-0 sm:max-w-4xl">
            <div className="grid md:grid-cols-[0.95fr_1.05fr]">
              <div className="bg-hero-gradient p-6 md:p-8 text-primary-foreground">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                  <Sparkles size={14} className="text-gold" />
                  Limited Seats
                </div>

                <DialogHeader className="mt-4 text-left">
                  <DialogTitle className="font-display text-3xl text-primary-foreground">Reserve Your Spot</DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-primary-foreground/75">
                    Fill in your details and our team will guide you through the next step within 24 hours.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-3">
                  <div className="flex gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                    <ShieldCheck size={18} className="text-gold shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-foreground/85">Personal guidance from the Focus Academy team.</p>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                    <Clock3 size={18} className="text-gold shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-foreground/85">
                      Fast response, clear next steps, and installment help if needed.
                    </p>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                    <Check size={18} className="text-gold shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-foreground/85">A smooth and focused enrollment experience.</p>
                  </div>
                </div>
              </div>

              <div className="bg-background p-6 md:p-8">
                <LeadCaptureForm />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <a
          href="https://wa.me/+9779709139754"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full mt-3 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
        >
          <MessageCircle size={18} />
          WhatsApp Us for Details
        </a>
      </div>
    </div>
  </SectionWrapper>
);

export default Pricing;
