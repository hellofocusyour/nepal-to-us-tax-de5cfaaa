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

const LearningObjectives = () => (
  <div className="bg-accent">
    <SectionWrapper id="learning-objectives">
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Learning Objectives</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Upon completing this course, you will be able to:
        </p>
      </div>
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-x-8 gap-y-4">
        {objectives.map((obj) => (
          <div key={obj} className="flex gap-3 items-start">
            <CheckCircle2 size={20} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{obj}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  </div>
);

export default LearningObjectives;
