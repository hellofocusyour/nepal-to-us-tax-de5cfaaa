import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useSEO } from "@/hooks/useSEO";

const TermsOfService = () => {
  useSEO({
    title: "Terms of Service | Focus Academy - US Tax Course Nepal",
    description:
      "Focus Academy Terms of Service: enrollment rules, payment terms, code of conduct, intellectual property, and conditions for using our US Tax training platform.",
    path: "/terms-of-service",
  });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By enrolling in any course or accessing the Focus Academy platform, you agree to be bound by these
              Terms of Service. If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">2. Course Enrollment</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Enrollment is confirmed only upon successful payment verification by our admin team.</li>
              <li>Course access is granted to the enrolled student only and is non-transferable.</li>
              <li>Sharing login credentials or course materials with third parties is strictly prohibited.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">3. Payment & Refunds</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>All payments must be made through approved channels and verified manually.</li>
              <li>Course fees are non-refundable once classes have commenced.</li>
              <li>In cases of cancellation before course start, refund eligibility is at the discretion of Focus Academy.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">4. Student Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Students are expected to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Maintain professional and respectful behavior with mentors and peers</li>
              <li>Attend classes regularly and complete assignments on time</li>
              <li>Not engage in plagiarism, cheating, or any form of academic dishonesty</li>
              <li>Comply with all platform rules and instructions</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All course materials, including videos, documents, presentations, and assessments, are the
              intellectual property of Focus Academy. Reproduction, redistribution, or commercial use without
              written consent is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">6. Certification</h2>
            <p className="text-muted-foreground leading-relaxed">
              Certificates of completion are issued only to students who meet attendance, participation, and
              assessment requirements. Focus Academy reserves the right to withhold certification for
              non-compliance with course standards.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Focus Academy provides training and education but does not guarantee employment or specific career
              outcomes. We are not liable for any indirect, incidental, or consequential damages arising from
              the use of our services.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">8. Account Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms, engage in
              fraudulent activity, or disrupt the learning environment, without refund.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">9. Modifications</h2>
            <p className="text-muted-foreground leading-relaxed">
              Focus Academy may revise these terms at any time. Continued use of the platform after changes
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">10. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of Nepal. Any disputes
              shall be resolved in the courts of Kathmandu.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">11. Contact</h2>
            <ul className="space-y-1 text-muted-foreground">
              <li>📧 hello@focusyourfinance.com</li>
              <li>📱 +977 970-9139754</li>
              <li>📍 Tinkuney, Kathmandu, Nepal</li>
            </ul>
          </section>

          <div className="pt-6">
            <Link to="/" className="text-primary hover:underline font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
