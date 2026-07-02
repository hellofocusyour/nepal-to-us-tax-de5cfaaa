import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { AlertCircle } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const RefundPolicy = () => {
  useSEO({
    title: "Refund Policy | Focus Academy - US Tax Course Nepal",
    description:
      "Focus Academy Refund Policy: all course payments are final and non-refundable. Read the full policy, exceptions, and contact details before enrolling.",
    path: "/refund-policy",
  });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 max-w-4xl">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary mb-2">
          Refund Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-5 mb-10 flex gap-3">
          <AlertCircle className="text-destructive shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-bold text-destructive mb-1">All Payments Are Non-Refundable</p>
            <p className="text-sm text-muted-foreground">
              Once payment is made and verified for any course offered by Focus Academy, the amount paid is
              strictly non-refundable under any circumstances.
            </p>
          </div>
        </div>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">1. No Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Focus Academy operates on a strict <strong>no-refund policy</strong>. By enrolling in any of our
              programs and completing payment, you acknowledge and agree that all fees paid are final and
              non-refundable, regardless of attendance, completion, or personal circumstances.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">2. Reasons for No Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The following situations <strong>do not qualify</strong> for a refund:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Change of mind after enrollment</li>
              <li>Inability to attend live or recorded sessions</li>
              <li>Personal, medical, professional, or scheduling conflicts</li>
              <li>Dissatisfaction with course pace, content, or delivery format</li>
              <li>Failure to complete assignments, assessments, or attendance requirements</li>
              <li>Termination of access due to violation of our Terms of Service</li>
              <li>Technical issues on the student's end (internet, device, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">3. Course Transfer</h2>
            <p className="text-muted-foreground leading-relaxed">
              In exceptional circumstances and at the sole discretion of Focus Academy, students may request a
              one-time transfer to a future batch of the same course. Transfer requests must be submitted in
              writing before the course commencement date. Transfers are not guaranteed and may incur
              administrative charges.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">4. Payment Verification</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments undergo manual verification by our admin team. Once verified and access is granted,
              the transaction is considered final. Students are advised to review course details, schedule, and
              requirements thoroughly before making payment.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">5. Duplicate Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              In the rare event of an accidental duplicate payment, the duplicate amount will be refunded after
              verification. Such requests must be raised within 7 days of the transaction with valid proof.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">6. Acknowledgement</h2>
            <p className="text-muted-foreground leading-relaxed">
              By proceeding with payment, you confirm that you have read, understood, and agreed to this Refund
              Policy in full.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-bold text-primary mb-3">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              For any questions related to this policy, please reach out:
            </p>
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

export default RefundPolicy;
