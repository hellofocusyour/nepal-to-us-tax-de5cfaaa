import { CalendarDays, BookOpen, Clock, GraduationCap } from "lucide-react";
import SectionWrapper from "./SectionWrapper";

const stats = [
  {
    icon: CalendarDays,
    label: "Duration",
    value: "22 Days",
    cardClass: "border-[#cfe7f2] bg-[#f4fbfe] text-navy hover:border-primary/35 hover:bg-[#e8f6fc]",
    iconClass: "bg-primary/10 text-primary",
    mutedClass: "text-navy/65",
    badgeClass: "bg-primary/10 text-primary",
  },
  {
    icon: BookOpen,
    label: "Classes",
    value: "22 Core + 4 Bonus",
    cardClass: "border-[#ead9ad] bg-[#fff9ec] text-navy hover:border-secondary/40 hover:bg-[#fcf1d4]",
    iconClass: "bg-secondary/15 text-secondary",
    mutedClass: "text-navy/65",
    badgeClass: "bg-secondary/15 text-secondary",
  },
  {
    icon: Clock,
    label: "Schedule",
    value: "4 Days a Week",
    cardClass: "border-[#cfe7f2] bg-[#f4fbfe] text-navy hover:border-primary/35 hover:bg-[#e8f6fc]",
    iconClass: "bg-primary/10 text-primary",
    mutedClass: "text-navy/65",
    badgeClass: "bg-primary/10 text-primary",
  },
  {
    icon: GraduationCap,
    label: "Format",
    value: "Live + Hands-on",
    cardClass: "border-[#ead9ad] bg-[#fff9ec] text-navy hover:border-secondary/40 hover:bg-[#fcf1d4]",
    iconClass: "bg-secondary/15 text-secondary",
    mutedClass: "text-navy/65",
    badgeClass: "bg-secondary/15 text-secondary",
  },
];

const CourseStats = () => (
  <div className="bg-accent">
    <SectionWrapper className="!py-8 md:!py-10">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, index) => (
          <div
            key={s.label}
            className={`group relative overflow-hidden rounded-[18px] border px-4 py-4 shadow-[0_10px_24px_-16px_rgba(15,35,63,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-16px_rgba(15,35,63,0.35)] ${s.cardClass}`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.iconClass}`}>
                <s.icon size={18} />
              </div>
              <div className={`rounded-full px-2 py-1 text-[10px] font-bold leading-none ${s.badgeClass}`}>
                {String(index + 1).padStart(2, "0")}
              </div>
            </div>
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${s.mutedClass}`}>{s.label}</p>
              <p className="mt-1 text-sm md:text-[15px] font-bold leading-snug">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  </div>
);

export default CourseStats;
