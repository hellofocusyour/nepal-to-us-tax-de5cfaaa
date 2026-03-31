import { FileText, Globe, Building2, Rocket, GraduationCap, Star } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { motion } from "framer-motion";

const items = [
  { icon: FileText, title: "Prepare US Tax Returns", desc: "Independently handle Individual & Business US Tax Returns from scratch." },
  { icon: Globe, title: "Work Remotely for US Firms", desc: "Freelance for American companies and earn in USD from Nepal." },
  { icon: Building2, title: "Land a Global MNC Job", desc: "Get hired at firms like Deloitte, EY, PwC, and KPMG." },
  { icon: Rocket, title: "Start Your Own Venture", desc: "Explore the booming US tax outsourcing market as an entrepreneur." },
  { icon: GraduationCap, title: "Path to EA & CPA", desc: "Build a strong foundation toward Enrolled Agent & CPA certifications." },
  { icon: Star, title: "Priority Hiring at Focus Academy", desc: "Top performers get first consideration for openings at Focus Academy." },
];

const Outcomes = () => (
  <SectionWrapper id="outcomes">
    <div className="text-center mb-12">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">What You'll Achieve</h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">Real outcomes, not just certificates. Here's what awaits you after completing this program.</p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="group rounded-xl border border-border bg-card p-6 card-shadow hover:card-shadow-hover transition-shadow duration-300"
        >
          <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <item.icon size={24} className="text-primary group-hover:text-primary-foreground transition-colors" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-2">{item.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
        </motion.div>
      ))}
    </div>
  </SectionWrapper>
);

export default Outcomes;
