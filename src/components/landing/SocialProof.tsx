import { useEffect, useRef, useState } from "react";
import SectionWrapper from "./SectionWrapper";

const counters = [
  { value: 1000, suffix: "+", label: "Tax Returns Filed" },
  { value: 25, suffix: "+", label: "Professionals Trained" },
  { value: 10, suffix: "+", label: "Placed at Focus Academy" },
  { value: 0, suffix: "", label: "Alumni in USA & Australia", special: "🌍" },
];

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          if (target === 0) return;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(interval);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

const CounterCard = ({ value, suffix, label, special }: (typeof counters)[0]) => {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-4xl md:text-5xl font-extrabold text-secondary mb-2">
        {special ? special : `${count.toLocaleString()}${suffix}`}
      </p>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
};

const SocialProof = () => (
  <div className="bg-accent">
    <SectionWrapper>
      <div className="text-center mb-12">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">By The Numbers</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {counters.map((c) => (
          <CounterCard key={c.label} {...c} />
        ))}
      </div>
    </SectionWrapper>
  </div>
);

export default SocialProof;
