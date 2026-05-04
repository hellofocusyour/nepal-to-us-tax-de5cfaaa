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

const Index = () => {
  useSEO({
    title: "Focus Academy — US Tax Course Nepal | Become a Job-Ready Tax Preparer in 30 Days",
    description:
      "Nepal's premier US Tax training. Become a job-ready US tax preparer in 30 days with IRS Enrolled Agent-led classes, hands-on Form 1040/1120/1065 practice, and remote job support.",
    path: "/",
    type: "website",
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
      <ChatInquiryButton />
    </>
  );
};

export default Index;
