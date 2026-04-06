import { useState } from "react";
import { Menu, X } from "lucide-react";
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
          <a
            href="#pricing"
            className="inline-flex items-center justify-center rounded-lg bg-secondary px-5 py-2 text-sm font-semibold text-secondary-foreground hover:opacity-90 transition-opacity"
          >
            Enroll Now
          </a>
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
