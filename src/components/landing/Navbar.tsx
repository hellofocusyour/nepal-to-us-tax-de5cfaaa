import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Career Breakthroughs", href: "#outcomes" },
  { label: "Curriculum", href: "#curriculum" },
  { label: "Mentors", href: "#mentors" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <a href="#" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <img src={logoImg} alt="Focus Academy Logo" className="h-10 w-20 object-contain" />
          Focus <span className="text-secondary">Academy</span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-4 py-2 text-[13px] font-semibold text-primary hover:bg-primary/5 transition-colors"
            style={{ borderRadius: "6px" }}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            style={{ borderRadius: "6px", marginLeft: "8px" }}
          >
            Sign Up
          </Link>
        </div>
        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-background border-b border-border"
          >
            <div className="flex flex-col gap-3 p-4">
              <div className="flex gap-2 pb-3 border-b border-border">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex-1 inline-flex items-center justify-center border border-primary bg-transparent px-4 py-2 text-[13px] font-semibold text-primary"
                  style={{ borderRadius: "6px" }}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 inline-flex items-center justify-center bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
                  style={{ borderRadius: "6px" }}
                >
                  Sign Up
                </Link>
              </div>
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-primary py-2"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                Enroll Now
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
