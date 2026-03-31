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

const Index = () => (
  <>
    <Navbar />
    <Hero />
    <Outcomes />
    <CourseStats />
    <LearningObjectives />
    <Curriculum />
    <TargetAudience />
    <Mentors />
    <SocialProof />
    <Pricing />
    <LeadForm />
    <AfterCourse />
    <FAQ />
    <FinalCTA />
    <Footer />
    <WhatsAppButton />
  </>
);

export default Index;
