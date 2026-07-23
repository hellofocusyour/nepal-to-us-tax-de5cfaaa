import { Shield, Award, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-navy text-primary-foreground/70 py-12">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        <div>
          <p className="font-display text-xl font-bold text-primary-foreground mb-3">
            Focus <span className="text-gold">Academy</span>
          </p>
          <p className="text-sm leading-relaxed">
            Nepal's premier US Tax training institute. From Nepal to the Global Tax Market.
          </p>
        </div>
        <div>
          <p className="font-bold text-primary-foreground text-sm mb-3">Quick Links</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/about" className="hover:text-primary-foreground transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link to="/curriculum" className="hover:text-primary-foreground transition-colors">
                Curriculum
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-primary-foreground transition-colors">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/faq" className="hover:text-primary-foreground transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-primary-foreground transition-colors">
                Student Sign In
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-bold text-primary-foreground text-sm mb-3">Contact</p>
          <ul className="space-y-2 text-sm">
            <li>📍 Tinkune, Kathmandu, Nepal</li>
            <li>📧 academy@focusyourfinance.com</li>
            <li>📱 +977 970-9139754</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <Shield size={14} className="text-gold" /> IRS Certified
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Award size={14} className="text-gold" /> Enrolled Agent
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <BadgeCheck size={14} className="text-gold" /> QuickBooks Certified
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 text-xs">
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="hover:text-primary-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-primary-foreground transition-colors">
              Terms of Service
            </Link>
            <Link to="/refund-policy" className="hover:text-primary-foreground transition-colors">
              Refund Policy
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Focus Academy. All rights reserved.</p>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
