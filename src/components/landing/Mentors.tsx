import { GraduationCap, Briefcase, BadgeCheck, Globe, Cog, Plane } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import ganeshImg from "@/assets/ganesh-dahal.png";
import kalashImg from "@/assets/kalash-shrestha.png";

interface Highlight {
  icon: React.ElementType;
  title: string;
  desc: string;
}

interface MentorCardProps {
  image: string;
  role: string;
  title: string;
  intro: string;
  highlights: Highlight[];
}

const MentorCard = ({ image, role, title, intro, highlights }: MentorCardProps) => (
  <div className="group rounded-2xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 hover:border-gold/40 transition-colors duration-300 overflow-hidden flex flex-col">
    {/* Clean image — no overlay, no text on top */}
    <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 border-b border-primary-foreground/10">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
      />
    </div>

    {/* All content stacked below with consistent rhythm */}
    <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 flex-1 flex flex-col">
      {/* Identity */}
      <div className="space-y-2">
        <span className="inline-block text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-gold px-2.5 py-1 rounded-md bg-gold/10 border border-gold/20">
          {role}
        </span>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-primary-foreground leading-tight">{title}</h3>
      </div>

      {/* Intro — sits right under title */}
      <p className="text-sm sm:text-base text-primary-foreground/75 leading-relaxed">{intro}</p>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 mt-auto">
        {highlights.map(({ icon: Icon, title: t, desc }) => (
          <div
            key={t}
            className="rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 p-3.5 hover:bg-gold/5 hover:border-gold/30 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center mb-2.5">
              <Icon size={16} className="text-gold" />
            </div>
            <h4 className="font-semibold text-sm text-primary-foreground mb-1 leading-tight">{t}</h4>
            <p className="text-xs text-primary-foreground/65 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Mentors = () => (
  <SectionWrapper id="mentors" dark>
    <div className="text-center mb-10 sm:mb-12 max-w-3xl mx-auto">
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
        Your Mentors: Learn from practitioners, not just professors.
      </h2>
      <p className="text-primary-foreground/70 text-base md:text-lg">
        Real-world expertise brought directly to your screen. Our mentors have built careers in the global market and
        are here to share their exact methodologies.
      </p>
    </div>

    <div className="grid lg:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
      <MentorCard
        image={ganeshImg}
        role="Lead Mentor"
        title="Nepal's Only IRS Enrolled Agent"
        intro="Bridging the gap between theoretical knowledge and practical execution in US Taxation."
        highlights={[
          {
            icon: GraduationCap,
            title: "IRS Certified",
            desc: "Enrolled Agent credentialed to practice before the IRS.",
          },
          {
            icon: Briefcase,
            title: "8+ Years Exp.",
            desc: "Deep US Tax experience and 1,000+ tax returns successfully filed.",
          },
          // { icon: BadgeCheck, title: "Certified Expert", desc: "QuickBooks Advisor and Certified Payroll Expert." },
        ]}
      />
      <MentorCard
        image={kalashImg}
        role="Co-Mentor"
        title="Returned from USA to Empower Nepal"
        intro="Bringing Silicon Valley standards back home to build global-ready professionals."
        highlights={[
          { icon: Globe, title: "Global Experience", desc: "8+ years working in California, USA." },
          { icon: Cog, title: "Industry Insights", desc: "Hands-on US industry experience and workflow optimization." },
          {
            icon: Plane,
            title: "Mission Driven",
            desc: "Dedicated to elevating local talent to international standards.",
          },
        ]}
      />
    </div>
  </SectionWrapper>
);

export default Mentors;
