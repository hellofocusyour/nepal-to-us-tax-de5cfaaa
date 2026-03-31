import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  id?: string;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}

const SectionWrapper = ({ id, children, className = "", dark }: Props) => (
  <section id={id} className={`py-16 md:py-24 ${dark ? "bg-hero-gradient text-primary-foreground" : ""} ${className}`}>
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="container mx-auto px-4"
    >
      {children}
    </motion.div>
  </section>
);

export default SectionWrapper;
