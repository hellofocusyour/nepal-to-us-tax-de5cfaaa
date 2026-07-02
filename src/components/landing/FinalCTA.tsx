import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import SectionWrapper from "./SectionWrapper";

const FinalCTA = () => (
  <SectionWrapper dark>
    <div className="text-center max-w-2xl mx-auto">
      <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
        Your global career starts here.
      </h2>
      <p className="text-lg text-primary-foreground/80 mb-8 leading-relaxed">
        22 days. One decision. One skill that pays for itself.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <a
          href="/pricing"
          className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-base font-bold text-gold-foreground transition-opacity hover:opacity-90"
          style={{ background: "var(--gold-gradient)" }}
        >
          Enroll Now
        </a>
        <a
          href="https://wa.me/9779709139754"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary-foreground/30 px-8 py-3.5 text-base font-bold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
        >
          <WhatsAppIcon size={20} />
          WhatsApp Us
        </a>
      </div>
    </div>
  </SectionWrapper>
);

export default FinalCTA;
