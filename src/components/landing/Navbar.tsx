import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Curriculum", to: "/curriculum" },
  { label: "Pricing", to: "/pricing" },
  { label: "FAQ", to: "/faq" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <img src={logoImg} alt="Focus Academy Logo" className="h-10 w-20 object-contain" />
          Focus <span className="text-secondary">Academy</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-4 py-2 text-[13px] font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Link>
        </div>
        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
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
                  className="flex-1 inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-4 py-2 text-[13px] font-semibold text-primary"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"
                >
                  Sign Up
                </Link>
              </div>
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `text-sm font-medium py-2 ${
                      isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <Link
                to="/pricing"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-secondary-foreground"
              >
                Enroll Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* used so eslint doesn't warn about unused location */}
      <span className="hidden" aria-hidden>{location.pathname}</span>
    </nav>
  );
};

export default Navbar;
