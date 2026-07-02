import PageShell from "@/components/landing/PageShell";
import Curriculum from "@/components/landing/Curriculum";
import LearningObjectives from "@/components/landing/LearningObjectives";
import TargetAudience from "@/components/landing/TargetAudience";
import Outcomes from "@/components/landing/Outcomes";
import AfterCourse from "@/components/landing/AfterCourse";
import SectionWrapper from "@/components/landing/SectionWrapper";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "react-router-dom";

const CurriculumPage = () => {
  useSEO({
    title: "US Tax Curriculum — 30 Day Program | Focus Academy",
    description:
      "A 30-day mentor-led curriculum covering Form 1040, 1120, 1065, payroll, and QuickBooks. Built for job-ready US tax preparers from Nepal.",
    path: "/curriculum",
    type: "website",
  });

  return (
    <PageShell
      eyebrow="Curriculum"
      title="30 Days. 4 Modules. One Job-Ready You."
      subtitle="Every session is built around a real form, a real client scenario, and a real skill you can put on your resume."
    >
      <LearningObjectives />
      <Curriculum />
      <TargetAudience />
      <Outcomes />
      <AfterCourse />

      <SectionWrapper>
        <div className="max-w-2xl mx-auto text-center rounded-2xl p-8 md:p-12 text-primary-foreground"
             style={{ background: "var(--hero-gradient)" }}>
          <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">Seats fill quickly each batch.</h3>
          <p className="text-primary-foreground/80 mb-6">
            Reserve yours today — flat NPR 20,000 with an installment option.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-bold text-gold-foreground hover:opacity-90 transition-opacity"
            style={{ background: "var(--gold-gradient)" }}
          >
            Enroll Now
          </Link>
        </div>
      </SectionWrapper>
    </PageShell>
  );
};

export default CurriculumPage;
