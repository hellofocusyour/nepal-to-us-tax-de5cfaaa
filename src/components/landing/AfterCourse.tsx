import { Smartphone, Video, Users, Trophy } from "lucide-react";
import SectionWrapper from "./SectionWrapper";

const pillars = [
  { icon: Smartphone, title: "Sunday WhatsApp Q&A", desc: "Get your questions answered weekly by the mentors." },
  { icon: Video, title: "Recorded Videos", desc: "Missed a class? Catch up anytime with full recordings." },
  { icon: Users, title: "Alumni Community", desc: "Network with fellow graduates and share opportunities." },
  { icon: Trophy, title: "Priority Job Openings", desc: "First consideration for positions at Focus Academy." },
];

const AfterCourse = () => (
  <SectionWrapper>
    <div className="text-center mb-12">
      <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">After The Course</h2>
      <p className="text-muted-foreground max-w-xl mx-auto">
        Our support doesn't end with the last class. Here's what you keep:
      </p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {pillars.map((p) => (
        <div key={p.title} className="rounded-xl bg-accent p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <p.icon size={22} className="text-primary" />
          </div>
          <h3 className="font-display text-base font-bold text-foreground mb-2">{p.title}</h3>
          <p className="text-sm text-muted-foreground">{p.desc}</p>
        </div>
      ))}
    </div>
  </SectionWrapper>
);

export default AfterCourse;
