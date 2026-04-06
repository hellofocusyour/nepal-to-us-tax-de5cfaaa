import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { motion, AnimatePresence } from "framer-motion";

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

const Curriculum = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <SectionWrapper id="curriculum">
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Comprehensive Curriculum</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          From zero to job-ready. 4 progressive levels covering everything you need.
        </p>
      </div>
      <div className="max-w-3xl mx-auto space-y-4">
        {levels.map((lvl, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={lvl.label} className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-accent/50 transition-colors"
              >
                <span className={`w-3 h-3 rounded-full shrink-0 ${lvl.color}`} />
                <div className="flex-1">
                  <span className="font-display text-lg font-bold text-foreground">{lvl.label}</span>
                  <span className="ml-2 text-xs font-medium text-muted-foreground">{lvl.tag}</span>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <ul className="px-5 pb-5 space-y-2">
                      {lvl.modules.map((m) => (
                        <li key={m} className="flex gap-3 text-sm text-muted-foreground">
                          <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${lvl.color}`} />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-6">
        <span className="font-semibold text-secondary">Bonus:</span> Company formation, monthly compliance, annual
        filings, dissolution - start to finish.
      </p>
    </SectionWrapper>
  );
};

export default Curriculum;
