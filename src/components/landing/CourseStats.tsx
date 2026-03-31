import { CalendarDays, BookOpen, Clock, GraduationCap } from "lucide-react";
import SectionWrapper from "./SectionWrapper";

const stats = [
  { icon: CalendarDays, label: "Duration", value: "1 Month" },
  { icon: BookOpen, label: "Classes", value: "22 Core + 4 Bonus" },
  { icon: Clock, label: "Schedule", value: "4 Days a Week" },
  { icon: GraduationCap, label: "Format", value: "Live + Hands-on" },
];

const CourseStats = () => (
  <div className="bg-accent">
    <SectionWrapper className="!py-10 md:!py-14">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-xl bg-card p-5 card-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-base font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  </div>
);

export default CourseStats;
