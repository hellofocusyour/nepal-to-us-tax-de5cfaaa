import { useEffect, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import SectionWrapper from "@/components/landing/SectionWrapper";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared layout for content pages (About, Curriculum, Pricing, FAQ).
 * Renders Navbar + branded header band + page content + Footer.
 */
const PageShell = ({ eyebrow, title, subtitle, children }: Props) => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <>
      <Navbar />
      <header className="relative overflow-hidden bg-hero-gradient text-primary-foreground pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="absolute inset-0 opacity-20 pointer-events-none"
             style={{ background: "radial-gradient(600px 300px at 20% 0%, hsl(var(--gold)/0.35), transparent 60%), radial-gradient(500px 300px at 90% 20%, hsl(var(--secondary)/0.4), transparent 60%)" }} />
        <div className="relative container mx-auto px-4 max-w-4xl text-center">
          {eyebrow && (
            <span className="inline-block rounded-full bg-gold/20 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-gold mb-5">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </header>
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export { SectionWrapper };
export default PageShell;
