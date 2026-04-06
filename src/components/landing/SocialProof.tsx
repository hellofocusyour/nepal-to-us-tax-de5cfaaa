import { Quote, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SectionWrapper from "./SectionWrapper";

const stats = [
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
      { threshold: 0.4 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

const StatCard = ({ value, suffix, label, special }: (typeof stats)[0]) => {
  const { count, ref } = useCountUp(value);

  return (
    <div ref={ref} className="text-center">
      <p className="mb-2 font-display text-4xl font-extrabold text-secondary md:text-5xl">
        {special ? special : `${count.toLocaleString()}${suffix}`}
      </p>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
};

const reviews = [
  {
    title: "Clear and beginner-friendly",
    feedback:
      "The course made US tax easy to understand. Learning in Nepali + English helped me confidently work through W-2, 1099, and 1040 practice files.",
    reviewer: "Bikash Pokhrel",
    location: "Kathmandu",
  },
  {
    title: "Actually practical, not just theory",
    feedback:
      "I liked that the training focused on real workflow, documentation, and return preparation. It felt directly connected to the kind of work clients expect.",
    reviewer: "Kalpana Bhandari",
    location: "Pokhara",
  },
  {
    title: "Great for a global career start",
    feedback:
      "The mentorship and career guidance gave me a much clearer path into bookkeeping and US tax support roles. It feels like a skill I can grow with.",
    reviewer: "Sabin Nepal",
    location: "Lalitpur",
  },
];

const highlights = [
  "Practical return preparation exercises",
  "IRS Enrolled Agent-led mentorship",
  "Career-focused support for global tax roles",
];

const SocialProof = () => (
  <div className="bg-accent/40">
    <SectionWrapper id="reviews">
      <div className="mb-14">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">By The Numbers</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>

      <div className="mx-auto mb-12 max-w-3xl border-t border-border/60 pt-12 text-center">
        <span className="mb-4 inline-flex rounded-full bg-gold/15 px-4 py-1.5 text-sm font-semibold text-gold">
          Learner Reviews
        </span>
        <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
          Why learners recommend Focus Academy
        </h2>
        <p className="text-base text-muted-foreground md:text-lg">
          A relevant, career-focused program for Nepal-based students and professionals who want real US tax skills -
          not just theory.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {reviews.map((review) => (
          <div
            key={`${review.reviewer}-${review.location}`}
            className="rounded-2xl border border-border/60 bg-background p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1"
          >
            <div className="mb-4 flex items-center justify-between">
              <Quote className="h-8 w-8 text-gold" />
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
            </div>

            <h3 className="mb-3 text-lg font-semibold text-foreground">{review.title}</h3>
            <p className="text-sm leading-7 text-muted-foreground">“{review.feedback}”</p>

            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="font-semibold text-foreground">{review.reviewer}</p>
              <p className="text-sm text-muted-foreground">{review.location}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {highlights.map((item) => (
          <span
            key={item}
            className="rounded-full border border-gold/30 bg-background px-4 py-2 text-sm font-medium text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </SectionWrapper>
  </div>
);

export default SocialProof;
