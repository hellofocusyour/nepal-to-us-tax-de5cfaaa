import { Shield, Award, BookOpen, BadgeCheck, MapPin } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import ganeshImg from "@/assets/ganesh-dahal.png";
import kalashImg from "@/assets/kalash-shrestha.png";

const Mentors = () => (
  <SectionWrapper id="mentors" dark>
    <div className="text-center mb-12">
      <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Your Mentors</h2>
      <p className="text-primary-foreground/70 max-w-xl mx-auto">Learn from practitioners, not just professors.</p>
    </div>
    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {/* Lead Mentor */}
      <div className="rounded-xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 p-8">
        <div className="flex items-start gap-5 mb-5">
          <div className="h-32 w-24 shrink-0 overflow-hidden rounded-2xl border border-gold/30 bg-gold/10">
            <img src={ganeshImg} alt="Lead Mentor" className="h-full w-full object-cover object-top" />
          </div>
          <div>
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mb-3">
              <Shield size={22} className="text-gold" />
            </div>
            <h3 className="font-display text-xl font-bold mb-1">Lead Mentor</h3>
            <p className="text-sm text-primary-foreground/60">Nepal's Only IRS Enrolled Agent</p>
          </div>
        </div>
        <ul className="space-y-2.5 text-sm text-primary-foreground/80">
          <li className="flex gap-2">
            <Award size={16} className="text-gold shrink-0 mt-0.5" /> 8+ years of US Tax experience
          </li>
          <li className="flex gap-2">
            <BookOpen size={16} className="text-gold shrink-0 mt-0.5" /> 1,000+ tax returns filed
          </li>
          <li className="flex gap-2">
            <BadgeCheck size={16} className="text-gold shrink-0 mt-0.5" /> IRS Certified Enrolled Agent
          </li>
          <li className="flex gap-2">
            <BadgeCheck size={16} className="text-gold shrink-0 mt-0.5" /> Certified QuickBooks Advisor
          </li>
          <li className="flex gap-2">
            <BadgeCheck size={16} className="text-gold shrink-0 mt-0.5" /> Certified Payroll Expert
          </li>
        </ul>
      </div>
      {/* Co-Mentor */}
      <div className="rounded-xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10 p-8">
        <div className="flex items-start gap-5 mb-5">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gold/30 bg-gold/10">
            <img src={kalashImg} alt="Co-Mentor" className="h-full w-full object-cover object-top" />
          </div>
          <div>
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mb-3">
              <MapPin size={22} className="text-gold" />
            </div>
            <h3 className="font-display text-xl font-bold mb-1">Co-Mentor</h3>
            <p className="text-sm text-primary-foreground/60">Returned from USA to Empower Nepal</p>
          </div>
        </div>
        <ul className="space-y-2.5 text-sm text-primary-foreground/80">
          <li className="flex gap-2">
            <Award size={16} className="text-gold shrink-0 mt-0.5" /> 8+ years working in California, USA
          </li>
          <li className="flex gap-2">
            <BookOpen size={16} className="text-gold shrink-0 mt-0.5" /> Hands-on US industry experience
          </li>
          <li className="flex gap-2">
            <BadgeCheck size={16} className="text-gold shrink-0 mt-0.5" /> Returned to Nepal to build global-ready
            professionals
          </li>
        </ul>
      </div>
    </div>
  </SectionWrapper>
);

export default Mentors;
