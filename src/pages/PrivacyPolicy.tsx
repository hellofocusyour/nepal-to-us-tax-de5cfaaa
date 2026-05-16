import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useSEO } from "@/hooks/useSEO";

const PrivacyPolicy = () => {
  useSEO({
    title: "Privacy Policy | Focus Academy — US Tax Course Nepal",
    description:
      "How Focus Academy collects, uses, and protects your personal, educational, and payment information when you enroll in our US Taxation training.",
    path: "/privacy-policy",
  });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-10">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="prose prose-slate max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Focus Academy ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you visit our website
              or enroll in our US Taxation training programs.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Personal Information:</strong> Name, email address, phone number, address, and date of birth.</li>
              <li><strong>Educational Information:</strong> Academic background, professional experience, and learning progress.</li>
              <li><strong>Payment Information:</strong> Payment screenshots and transaction details for course enrollment.</li>
              <li><strong>Technical Information:</strong> IP address, browser type, device information, and usage data.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To process your enrollment and provide course access</li>
              <li>To verify payments and issue certificates</li>
              <li>To communicate course updates, announcements, and important notifications</li>
              <li>To improve our services and student experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit
              and at rest using industry-standard security protocols.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share information
              only with trusted service providers who assist us in operating our platform, conducting our business,
              or serving our students, provided they agree to keep this information confidential.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">6. Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal requirements)</li>
              <li>Withdraw consent for marketing communications at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience on our platform.
              You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">8. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by
              posting the updated policy on this page with a new "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="mt-3 space-y-1 text-muted-foreground">
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

export default PrivacyPolicy;
