import { Briefcase, Laptop, Building, GraduationCap, BookOpen, Rocket } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { motion } from "framer-motion";

const audiences = [
  { icon: Briefcase, title: "Job Seekers", desc: "Land a role at a global MNC like Deloitte, EY, or PwC." },
  { icon: Laptop, title: "Freelancers", desc: "Work remotely for US firms and earn in USD from home." },
  { icon: Building, title: "Entrepreneurs", desc: "Tap into the massive US tax outsourcing market." },
  { icon: GraduationCap, title: "CA/ACCA Students", desc: "Outpace your peers with a globally-relevant skillset." },
  { icon: BookOpen, title: "Freshers", desc: "No degree required — we start from scratch." },
  { icon: Rocket, title: "Promotion Seekers", desc: "Add a powerful global skill to your resume." },
];

const TargetAudience = () => (
  <SectionWrapper id="audience">
    <div className="text-center mb-12">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Is This For You?</h2>
      <p className="text-muted-foreground max-w-2xl mx-auto">
        Whether you're starting fresh or leveling up — this course meets you where you are.
      </p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {audiences.map((a, i) => (
        <motion.div
          key={a.title}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07 }}
          className="rounded-xl border border-border bg-card p-6 card-shadow text-center hover:card-shadow-hover transition-shadow"
        >
          <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <a.icon size={26} className="text-secondary" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-2">{a.title}</h3>
          <p className="text-sm text-muted-foreground">{a.desc}</p>
        </motion.div>
      ))}
    </div>
    <div className="bg-accent rounded-xl p-5 text-center max-w-2xl mx-auto">
      <p className="text-sm text-foreground font-medium">
        🗣️ Taught in <strong>Neplish</strong>. No prior US tax knowledge needed. <strong>Basic accounting module included.</strong>
      </p>
    </div>
  </SectionWrapper>
);

export default TargetAudience;
