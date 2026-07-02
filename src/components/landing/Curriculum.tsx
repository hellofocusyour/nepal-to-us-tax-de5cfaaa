import SectionWrapper from "./SectionWrapper";
import {
  BookOpen,
  FileText,
  DollarSign,
  SlidersHorizontal,
  Calculator,
  BarChart3,
  Wrench,
  Building2,
  Users,
  CheckCircle2,
  Star,
  Gift,
} from "lucide-react";

const levels = [
  {
    color: "bg-emerald-500",
    label: "Beginner",
    tag: "Modules 1–2",
    modules: [
      "Module 1: Foundations of US Taxation - Tax overview, Individual Tax Formula, Form 1040 Review",
      "Module 2: Filing Fundamentals - Tax IDs, Filing Status, Dependents",
    ],
  },
  {
    color: "bg-primary",
    label: "Intermediate",
    tag: "Modules 3–5",
    modules: [
      "Module 3: Gross Income Deep Dive - W-2, Interest, Dividends, Capital Gains, Retirement Income",
      "Module 4: Adjustments, Deductions & QBI - Above-the-line, Standard vs Itemized, Section 199A",
      "Module 5: Tax Calculation & Credits - Tax Brackets, Refundable vs Non-Refundable Credits, Other Taxes",
    ],
  },
  {
    color: "bg-orange-500",
    label: "Advanced",
    tag: "Modules 6–8",
    modules: [
      "Module 6: Capital Gains & Depreciation - Schedule D, MACRS, Section 179, Bonus Depreciation",
      "Module 7: Practical Tax Preparation - Software alignment, Real-time returns, Financial Statements",
      "Module 8: Business Tax Returns - Entity types, S-Corp & C-Corp, Forms 1120/1120S/1065, K-1",
    ],
  },
  {
    color: "bg-red-500",
    label: "Expert",
    tag: "Module 9 + Bonus",
    modules: [
      "Module 9: Advanced & Real-World - Client prep, Entity Compliance, US CPA Guest Lecture",
      "Bonus 1: IRS Notices - CP2000, CP12, CP14 & How to Respond",
      "Bonus 2: Amended Returns - Form 1040-X",
      "Bonus 3: Introduction to Tax Planning Strategies",
    ],
  },
];

const level1Icons = [BookOpen, FileText];
const level2Icons = [DollarSign, SlidersHorizontal, Calculator];
const level3Icons = [BarChart3, Wrench, Building2];

const Curriculum = () => {
  return (
    <SectionWrapper id="curriculum" className="!pt-4 md:!pt-6">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-block text-xs font-bold tracking-widest uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-3">
          Education Roadmap
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">Comprehensive Curriculum</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-base">
          From zero to job-ready. 4 progressive levels covering everything you need.
        </p>
      </div>

      {/* Grid wrapper - all levels */}
      <div className="space-y-4">
        {/* Row 1: Level 1 + Level 2 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Level 1 */}
          <div className="rounded-xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border-b border-emerald-100">
              <span className="bg-emerald-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Level 1
              </span>
              <span className="text-sm font-bold text-emerald-700">{levels[0].label}</span>
              <span className="ml-auto text-xs text-emerald-600/70 font-medium">{levels[0].tag}</span>
            </div>
            <div className="p-4 space-y-2">
              {levels[0].modules.map((m, i) => {
                const Icon = level1Icons[i];
                return (
                  <div key={m} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-sm text-muted-foreground leading-relaxed">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level 2 */}
          <div className="rounded-xl border border-primary/15 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-primary/5 border-b border-primary/10">
              <span className="bg-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Level 2
              </span>
              <span className="text-sm font-bold text-primary">{levels[1].label}</span>
              <span className="ml-auto text-xs text-primary/60 font-medium">{levels[1].tag}</span>
            </div>
            <div className="p-4 space-y-2">
              {levels[1].modules.map((m, i) => {
                const Icon = level2Icons[i];
                return (
                  <div key={m} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground leading-relaxed">{m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: Level 3 - full width 3-col */}
        <div className="rounded-xl border border-orange-100 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 bg-orange-50 border-b border-orange-100">
            <span className="bg-orange-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
              Level 3
            </span>
            <span className="text-sm font-bold text-orange-700">{levels[2].label}</span>
            <span className="ml-auto text-xs text-orange-600/70 font-medium">{levels[2].tag}</span>
          </div>
          <div className="p-4 grid md:grid-cols-3 gap-3">
            {levels[2].modules.map((m, i) => {
              const Icon = level3Icons[i];
              const labels = ["Capital & Depreciation", "Tax Preparation", "Business Returns"];
              return (
                <div
                  key={m}
                  className="flex flex-col gap-2.5 p-3.5 rounded-lg bg-orange-50/70 border border-orange-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wide">{labels[i]}</span>
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">{m}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 3: Level 4 - Expert left + Bonus right, true 50/50 with matching content density */}
        <div className="rounded-xl border border-primary/20 bg-white shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Expert - teal */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-primary border-b border-primary/80">
                <span className="bg-secondary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                  Level 4
                </span>
                <span className="text-sm font-bold text-white">{levels[3].label}</span>
                <span className="ml-auto text-xs text-white/50 font-medium">{levels[3].tag}</span>
              </div>
              <div className="p-4 flex flex-col gap-3 bg-primary/3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/8 border border-primary/12">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80 leading-relaxed">{levels[3].modules[0]}</span>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <Star className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span className="text-xs text-muted-foreground">Includes live US CPA Guest Lecture session</span>
                </div>
                <div className="flex items-center gap-2 px-1">
                  <Star className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span className="text-xs text-muted-foreground">Real client scenarios & entity compliance</span>
                </div>
              </div>
            </div>

            {/* Bonus - accent */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-accent border-b border-primary/10">
                <span className="bg-secondary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                  Bonus
                </span>
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary">Exclusive Add-ons</span>
              </div>
              <div className="p-4 flex flex-col gap-2 bg-accent/60">
                {levels[3].modules.slice(1).map((m) => (
                  <div key={m} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-primary/10">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/80 leading-relaxed">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl bg-muted/50 border border-border p-8 text-center mt-6">
        <h3 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Ready to reach Expert Mastery?
        </h3>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">
          From zero to job-ready. 4 progressive levels covering everything you need.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="/pricing"
            className="inline-flex items-center px-7 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Enroll in Curriculum
          </a>
          {/* <a
            href="#curriculum"
            className="inline-flex items-center px-7 py-3 rounded-full border-2 border-red-500 text-red-500 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            Download PDF Syllabus
          </a> */}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-5">
        <span className="font-semibold text-secondary">Bonus:</span> Company formation, monthly compliance, annual
        filings, dissolution - start to finish.
      </p>
    </SectionWrapper>
  );
};

export default Curriculum;
