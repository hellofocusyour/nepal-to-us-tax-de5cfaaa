import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Outcomes from "@/components/landing/Outcomes";
import CourseStats from "@/components/landing/CourseStats";
import SocialProof from "@/components/landing/SocialProof";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import SectionWrapper from "@/components/landing/SectionWrapper";
import { useSEO } from "@/hooks/useSEO";
import { BookOpen, Users, Wallet, HelpCircle, ArrowRight } from "lucide-react";

const explore = [
  { to: "/about", icon: Users, title: "About Us", desc: "Meet the mentors and the mission behind Focus Academy." },
  { to: "/curriculum", icon: BookOpen, title: "Curriculum", desc: "22 days, 4 modules, real US tax forms. See what you'll build." },
  { to: "/pricing", icon: Wallet, title: "Pricing & Enroll", desc: "Flat NPR 20,000 — installment friendly. Reserve your seat." },
  { to: "/faq", icon: HelpCircle, title: "FAQ", desc: "Answers about eligibility, language, certificates & jobs." },
];

const Index = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  useSEO({
    title: "US Tax Course Nepal — Job-Ready in 22 Days | Focus Academy",
    description:
      "Nepal's premier US Tax training. Become a job-ready US tax preparer in 22 days with IRS Enrolled Agent-led classes, hands-on Form practices, and remote job support. Flat NPR 20,000.",
    path: "/",
    type: "website",
  });

  return (
    <>
      <Navbar />
      <Hero />
      <Outcomes />
      <CourseStats />

      <SectionWrapper>
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-gold/10 border border-gold/30 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-secondary mb-4">
            Explore
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Everything you need to decide — in one place.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Dive deeper into the program, meet the mentors, review pricing, or get your questions answered.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {explore.map((e) => (
            <Link
              key={e.to}
              to={e.to}
              className="group rounded-2xl bg-card border border-border p-6 card-shadow hover:border-secondary/40 hover:-translate-y-1 transition-all"
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                   style={{ background: "var(--gold-gradient)" }}>
                <e.icon size={22} className="text-gold-foreground" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">{e.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{e.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">
                Learn more <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </SectionWrapper>

      <SocialProof />
      <FinalCTA />
      <Footer />
      <WhatsAppButton />
    </>
  );
};

export default Index;
