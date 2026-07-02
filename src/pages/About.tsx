import PageShell from "@/components/landing/PageShell";
import Mentors from "@/components/landing/Mentors";
import SocialProof from "@/components/landing/SocialProof";
import SectionWrapper from "@/components/landing/SectionWrapper";
import { useSEO } from "@/hooks/useSEO";
import { GraduationCap, Globe2, HeartHandshake, Target } from "lucide-react";
import { Link } from "react-router-dom";

const values = [
  { icon: Target, title: "Job-First Curriculum", desc: "Every module maps to a real task you'll do on day one at a US CPA firm." },
  { icon: Globe2, title: "Global Career, Local Roots", desc: "Learn in Neplish so complex US tax law finally clicks — then work from anywhere in Nepal." },
  { icon: HeartHandshake, title: "Mentor-Led, Not Recorded", desc: "Live classes with an IRS Enrolled Agent and a working US tax preparer. Real answers, real time." },
  { icon: GraduationCap, title: "Alumni Network That Hires", desc: "Top performers get first shot at Focus Academy roles and referrals to partner firms." },
];

const About = () => {
  useSEO({
    title: "About Focus Academy — Nepal's US Tax Training Institute",
    description:
      "Focus Academy is Nepal's premier US Tax training institute. Learn our mission, meet our IRS Enrolled Agent mentors, and see why students trust us for global careers.",
    path: "/about",
    type: "website",
  });

  return (
    <PageShell
      eyebrow="About Focus Academy"
      title="From Nepal to the Global Tax Market"
      subtitle="We're building Nepal's most trusted pathway into US taxation — one mentor-led cohort at a time."
    >
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">Our Mission</h2>
          <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            <p>
              Thousands of Nepali accountants, CA/ACCA students, and finance graduates are ready for the world — but the world doesn't always know how to reach them. Focus Academy exists to close that gap.
            </p>
            <p>
              We teach US taxation the way it's actually practiced inside American CPA firms: hands-on with Form 1040, 1120, and 1065, taught in Neplish so nothing gets lost in translation, and led by an IRS Enrolled Agent who does this work every day.
            </p>
            <p>
              In 22 days you don't just "learn US tax" — you become someone a US firm can hire. That's the promise.
            </p>
          </div>
        </div>
      </SectionWrapper>

      <div className="bg-accent">
        <SectionWrapper>
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">What We Stand For</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four commitments we make to every student who joins Focus Academy.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl bg-card border border-border p-6 card-shadow">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-4"
                     style={{ background: "var(--gold-gradient)" }}>
                  <v.icon size={22} className="text-gold-foreground" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </SectionWrapper>
      </div>

      <Mentors />
      <SocialProof />

      <SectionWrapper>
        <div className="max-w-2xl mx-auto text-center rounded-2xl border border-border bg-card p-8 md:p-12 card-shadow">
          <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
            Ready to see the curriculum?
          </h3>
          <p className="text-muted-foreground mb-6">
            22 days, 4 modules, hands-on practice with real US tax forms.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/curriculum"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
              Explore Curriculum
            </Link>
            <Link to="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-sm font-bold text-foreground hover:bg-accent transition-colors">
              See Pricing
            </Link>
          </div>
        </div>
      </SectionWrapper>
    </PageShell>
  );
};

export default About;
