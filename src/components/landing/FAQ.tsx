import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionWrapper from "./SectionWrapper";
import { AnimatePresence, motion } from "framer-motion";

const faqs = [
  {
    q: "Who is eligible for this course?",
    a: "Anyone interested in learning US taxation - freshers, accountants, CA/ACCA students, or working professionals. No prior US tax knowledge is required.",
  },
  {
    q: "What language is the course taught in?",
    a: "The course is taught in Neplish - a mix of Nepali and English - making it easy to understand complex tax concepts.",
  },
  {
    q: "Do I need any prerequisites?",
    a: "No. We include a basic accounting module to get you up to speed. You just need a laptop and willingness to learn.",
  },
  {
    q: "Is this useful for CA/ACCA students?",
    a: "Absolutely! This course adds a highly practical, globally-relevant skill to complement your CA/ACCA studies.",
  },
  {
    q: "What payment options are available?",
    a: "The fee is a flat NPR 20,000 - no VAT, no hidden fees. You can pay in full or split it into 2 easy installments of NPR 10,000 at no extra cost.",
  },
  {
    q: "Will I receive a certificate?",
    a: "Yes, upon successful completion you'll receive a Focus Academy certificate that you can add to your resume and LinkedIn.",
  },
  {
    q: "Do you help with job placement?",
    a: "Top performers get priority consideration for positions at Focus Academy, and we provide job referral support to our alumni network.",
  },
];

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="bg-accent">
      <SectionWrapper id="faq">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} className="rounded-xl bg-card border border-border overflow-hidden">
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-foreground text-sm pr-4">{f.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </SectionWrapper>
    </div>
  );
};

export default FAQ;
