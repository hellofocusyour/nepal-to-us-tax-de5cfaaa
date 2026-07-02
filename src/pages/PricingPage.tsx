import PageShell from "@/components/landing/PageShell";
import Pricing from "@/components/landing/Pricing";
import AfterCourse from "@/components/landing/AfterCourse";
import SocialProof from "@/components/landing/SocialProof";
import { useSEO } from "@/hooks/useSEO";

const PricingPage = () => {
  useSEO({
    title: "Pricing — Flat NPR 20,000 | Focus Academy",
    description:
      "Flat NPR 20,000 all-inclusive. Live classes, recorded videos, notes, certificate, WhatsApp community and job referral support. Installment option available.",
    path: "/pricing",
    type: "website",
  });

  return (
    <PageShell
      eyebrow="Pricing & Enrollment"
      title="One flat fee. Everything included."
      subtitle="NPR 20,000 covers all 30 days of live training, materials, mentorship, community, and job support. No VAT. No surprises."
    >
      <Pricing />
      <AfterCourse />
      <SocialProof />
    </PageShell>
  );
};

export default PricingPage;
