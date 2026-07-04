import PageShell from "@/components/landing/PageShell";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import { useSEO } from "@/hooks/useSEO";

const FAQS = [
  { q: "Who is eligible for this course?", a: "Anyone interested in learning US taxation - freshers, accountants, CA/ACCA students, or working professionals. No prior US tax knowledge is required." },
  { q: "What language is the course taught in?", a: "The course is taught in Neplish - a mix of Nepali and English - making it easy to understand complex tax concepts." },
  { q: "Do I need any prerequisites?", a: "No. We include a basic accounting module to get you up to speed. You just need a laptop and willingness to learn." },
  { q: "Is this useful for CA/ACCA students?", a: "Absolutely! This course adds a highly practical, globally-relevant skill to complement your CA/ACCA studies." },
  { q: "What payment options are available?", a: "The fee is a flat NPR 20,000 - no VAT, no hidden fees. You can pay in full or split it into 2 easy installments of NPR 10,000 at no extra cost." },
  { q: "Will I receive a certificate?", a: "Yes, upon successful completion you'll receive a Focus Academy certificate that you can add to your resume and LinkedIn." },
  { q: "Do you help with job placement?", a: "Top performers get priority consideration for positions at Focus Academy, and we provide job referral support to our alumni network." },
];

const FAQPage = () => {
  useSEO({
    title: "US Tax Course Nepal FAQ | Tax Preparation Training",
    description:
      "FAQs on Nepal's leading US Tax Course: eligibility, Neplish language, NPR 20,000 fee, installments, certificates and remote tax preparer job support.",
    path: "/faq",
    type: "website",
    faqs: FAQS,
  });

  return (
    <PageShell
      eyebrow="FAQ"
      title="Everything students ask us - answered."
      subtitle="Still unsure? WhatsApp us anytime and our team will help you decide if the program is right for you."
    >
      <FAQ />
      <FinalCTA />
    </PageShell>
  );
};

export default FAQPage;
