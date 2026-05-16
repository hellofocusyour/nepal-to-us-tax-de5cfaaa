import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Outcomes from "@/components/landing/Outcomes";
import CourseStats from "@/components/landing/CourseStats";
import Curriculum from "@/components/landing/Curriculum";
import LearningObjectives from "@/components/landing/LearningObjectives";
import TargetAudience from "@/components/landing/TargetAudience";
import Mentors from "@/components/landing/Mentors";
import SocialProof from "@/components/landing/SocialProof";
import Pricing from "@/components/landing/Pricing";
import AfterCourse from "@/components/landing/AfterCourse";
import FAQ from "@/components/landing/FAQ";
import FinalCTA from "@/components/landing/FinalCTA";
import LeadForm from "@/components/landing/LeadForm";
import Footer from "@/components/landing/Footer";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import ChatInquiryButton from "@/components/landing/ChatInquiryButton";
import { useSEO } from "@/hooks/useSEO";

const FAQS = [
  { q: "Who is eligible for this course?", a: "Anyone interested in learning US taxation - freshers, accountants, CA/ACCA students, or working professionals. No prior US tax knowledge is required." },
  { q: "What language is the course taught in?", a: "The course is taught in Neplish - a mix of Nepali and English - making it easy to understand complex tax concepts." },
  { q: "Do I need any prerequisites?", a: "No. We include a basic accounting module to get you up to speed. You just need a laptop and willingness to learn." },
  { q: "Is this useful for CA/ACCA students?", a: "Absolutely! This course adds a highly practical, globally-relevant skill to complement your CA/ACCA studies." },
  { q: "What payment options are available?", a: "The fee is NPR 20,000 + VAT. You can pay in full or in 2 installments (with NPR 500 additional)." },
  { q: "Will I receive a certificate?", a: "Yes, upon successful completion you'll receive a Focus Academy certificate that you can add to your resume and LinkedIn." },
  { q: "Do you help with job placement?", a: "Top performers get priority consideration for positions at Focus Academy, and we provide job referral support to our alumni network." },
];

const Index = () => {
  useSEO({
    title: "US Tax Course Nepal — Job-Ready in 30 Days | Focus Academy",
    description:
      "Nepal's premier US Tax training. Become a job-ready US tax preparer in 30 days with IRS Enrolled Agent-led classes, hands-on Form practices, and remote job support.",
    path: "/",
    type: "website",
    faqs: FAQS,
  });

  return (
    <>
      <Navbar />
      <Hero />
      <Outcomes />
      <CourseStats />
      <LearningObjectives />
      <Pricing />
      <TargetAudience />
      <Curriculum />
      <Mentors />
      <SocialProof />
      <AfterCourse />
      <FAQ />
      <FinalCTA />
      <Footer />
      <WhatsAppButton />
      {/* <ChatInquiryButton /> hidden for now */}
    </>
  );
};

export default Index;
