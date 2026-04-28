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
  <div className="group rounded-2xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 hover:border-gold/40 transition-colors duration-300 flex flex-col overflow-hidden">
    {/* Header: image + identity side by side */}
    <div className="p-5 sm:p-6 flex items-start gap-5 sm:gap-6 border-b border-primary-foreground/10">
      {/* Clean portrait, no overlay */}
      <div className="relative flex-shrink-0">
        <div className="w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden ring-2 ring-gold/30 group-hover:ring-gold/60 transition-colors bg-primary/40">
          <img src={image} alt={title} className="w-full h-full object-cover object-center" />
        </div>
        {/* Subtle gold accent under photo */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-gold/60" />
      </div>

      {/* Identity block */}
      <div className="flex-1 min-w-0 pt-1">
        <span className="inline-block text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-gold mb-2 px-2 py-1 rounded-md bg-gold/10 border border-gold/20">
          {role}
        </span>
        <h3 className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-primary-foreground leading-tight mb-2">
          {title}
        </h3>
      </div>
    </div>

    {/* Intro */}
    <div className="px-5 sm:px-6 pt-5">
      <p className="text-sm sm:text-base text-primary-foreground/75 leading-relaxed">{intro}</p>
    </div>

    {/* Highlights */}
    <div className="p-5 sm:p-6 flex-1 flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-auto">
        {highlights.map(({ icon: Icon, title: t, desc }) => (
          <div
            key={t}
            className="rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 p-4 hover:bg-gold/5 hover:border-gold/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-gold/15 flex items-center justify-center mb-3">
              <Icon size={18} className="text-gold" />
            </div>
            <h4 className="font-semibold text-sm text-primary-foreground mb-1">{t}</h4>
            <p className="text-xs text-primary-foreground/65 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Mentors = () => (
  <SectionWrapper id="mentors" dark>
    <div className="text-center mb-12 max-w-3xl mx-auto">
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
          { icon: BadgeCheck, title: "Certified Expert", desc: "QuickBooks Advisor and Certified Payroll Expert." },
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
