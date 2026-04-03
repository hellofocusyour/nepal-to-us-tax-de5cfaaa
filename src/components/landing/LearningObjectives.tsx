import { CheckCircle2 } from "lucide-react";
import SectionWrapper from "./SectionWrapper";

const objectives = [
  "Prepare a complete US Individual Income Tax Return (Form 1040) from scratch",
  "Understand and apply the full Individual Tax Formula from gross income to tax due/refund",
  "Identify and correctly classify all major income types, adjustments, and deductions",
  "Prepare Schedule C (Business Income), Schedule D (Capital Gains), and Schedule E (Rental/K-1)",
  "Understand corporate, S-corp, and partnership tax return differences",
  "Prepare basic business tax returns: Forms 1120, 1120S, and 1065",
  "Prepare and analyze Form K-1 for flow-through entities",
  "Apply tax credits, calculate Other Taxes (AMT, NIIT, SE Tax), and finalize returns",
  "Handle common tax documents: W-2, 1099 series, 1098, K-1, and more",
  "Use professional tax software and Excel for preparation and reporting",
  "Communicate effectively with clients and manage a real-world tax workflow",
  "Understand audit risks, IRS notices, and basic tax planning strategies",
];

const cardVariants = [
  {
    wrapper:
      "border-[#3aa3c8]/45 bg-[#16779b] shadow-[0_14px_30px_-16px_rgba(0,0,0,0.45)] hover:bg-[#1a86ae] hover:border-[#67c5e6]",
    icon: "text-secondary",
    number: "bg-secondary text-navy",
    text: "text-white",
  },
  {
    wrapper:
      "border-[#1d85ac]/40 bg-[#116b8c] shadow-[0_14px_30px_-16px_rgba(0,0,0,0.45)] hover:bg-[#1590be] hover:border-[#58c1e5]",
    icon: "text-[#f2c14d]",
    number: "bg-[#1487b4] text-white",
    text: "text-white",
  },
];

const LearningObjectives = () => (
  <SectionWrapper id="learning-objectives" dark className="relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute left-10 bottom-0 h-40 w-40 rounded-full border border-primary-foreground/10" />
      <div className="absolute right-10 top-16 h-32 w-32 rounded-full border border-primary-foreground/10" />
    </div>

    <div className="relative">
      <div className="mb-10 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Learning <span className="text-gradient-gold">Objectives</span>
        </h2>
        <p className="max-w-2xl mx-auto text-primary-foreground/80">
          Upon completing this course, you will be able to:
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {objectives.map((obj, index) => {
          const variant = cardVariants[index % cardVariants.length];

          return (
            <div
              key={obj}
              className={`group relative h-full rounded-[24px] border px-5 pb-5 pt-9 transition-all duration-300 hover:-translate-y-1 ${variant.wrapper}`}
            >
              <div
                className={`absolute left-5 top-[-16px] flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${variant.number}`}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className={`shrink-0 mt-0.5 ${variant.icon}`} />
                <p className={`text-sm leading-7 ${variant.text}`}>{obj}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </SectionWrapper>
);

export default LearningObjectives;
