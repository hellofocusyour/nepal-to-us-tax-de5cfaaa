import { motion } from "framer-motion";
import { Shield, Award, BookOpen, BadgeCheck } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const badges = [
  { icon: Shield, label: "IRS Certified" },
  { icon: Award, label: "Enrolled Agent" },
  { icon: BookOpen, label: "Certified QuickBooks Advisor" },
  { icon: BadgeCheck, label: "Certified Payroll Expert" },
];

const Hero = () => (
  <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
    <div className="absolute inset-0 bg-hero-gradient" />
    <div
      className="absolute inset-0 opacity-30 bg-cover bg-center"
      style={{ backgroundImage: `url(${heroBg})` }}
    />
    <div className="relative container mx-auto px-4 py-20 md:py-32">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-3xl"
      >
        <span className="inline-block rounded-full bg-gold/20 px-4 py-1.5 text-sm font-semibold text-gold mb-6">
          From Nepal to the Global Tax Market
        </span>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-6">
          Become a Job-Ready US Tax Preparer{" "}
          <span className="text-gradient-gold">in Just 1 Month</span>
        </h1>
        <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl font-body leading-relaxed">
          Nepal's only IRS Enrolled Agent-led training program — taught in Neplish, designed for your global career.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <a
            href="#pricing"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3.5 text-base font-bold text-gold-foreground transition-opacity hover:opacity-90"
            style={{ background: "var(--gold-gradient)" }}
          >
            Enroll Now
          </a>
          <a
            href="https://wa.me/9779800000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border-2 border-primary-foreground/30 px-8 py-3.5 text-base font-bold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
          >
            Talk to Us
          </a>
        </div>
        <div className="flex flex-wrap gap-4">
          {badges.map((b, i) => (
            <motion.div
              key={b.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm px-4 py-2"
            >
              <b.icon size={16} className="text-gold" />
              <span className="text-xs font-semibold text-primary-foreground">{b.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default Hero;
