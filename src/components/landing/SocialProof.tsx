import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import SectionWrapper from "./SectionWrapper";
import avatar1 from "@/assets/avatar-1.png";
import avatar2 from "@/assets/avatar-2.png";
import avatar3 from "@/assets/avatar-3.png";
import avatar4 from "@/assets/avatar-4.png";

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
    avatar: avatar2,
  },
  {
    title: "Actually practical, not just theory",
    feedback:
      "I liked that the training focused on real workflow, documentation, and return preparation. It felt directly connected to the kind of work clients expect.",
    reviewer: "Kalpana Bhandari",
    location: "Pokhara",
    avatar: avatar1,
  },
  {
    title: "Great for a global career start",
    feedback:
      "The mentorship and career guidance gave me a much clearer path into bookkeeping and US tax support roles. It feels like a skill I can grow with.",
    reviewer: "Sabin Nepal",
    location: "Lalitpur",
    avatar: avatar3,
  },
  {
    title: "Built my confidence for client work",
    feedback:
      "Working through real return scenarios and edge cases gave me the confidence to handle actual US tax preparation. The structured practice made all the difference.",
    reviewer: "Anil Tamang",
    location: "Bhaktapur",
    avatar: avatar4,
  },
];

const highlights = [
  "Practical return preparation exercises",
  "IRS Enrolled Agent-led mentorship",
  "Career-focused support for global tax roles",
];

const ReviewsCarousel = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "prev" | "next") => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector("article");
    const cardW = (card as HTMLElement | null)?.offsetWidth ?? 320;
    const gap = 24;
    scrollRef.current.scrollBy({
      left: dir === "next" ? cardW + gap : -(cardW + gap),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review) => (
          <article
            key={`${review.reviewer}-${review.location}`}
            className="snap-start shrink-0 w-[85%] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] rounded-2xl border border-border/60 bg-background p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1"
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
            <p className="text-sm leading-7 text-muted-foreground">"{review.feedback}"</p>

            <div className="mt-5 flex items-center gap-3 border-t border-border/60 pt-4">
              <img
                src={review.avatar}
                alt={review.reviewer}
                loading="lazy"
                className="h-12 w-12 rounded-full object-cover border border-border/60"
              />
              <div>
                <p className="font-semibold text-foreground">{review.reviewer}</p>
                <p className="text-sm text-muted-foreground">{review.location}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll("prev")}
        aria-label="Previous review"
        className="absolute left-1 sm:-left-5 top-[40%] -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full bg-background border border-border/60 shadow-md hover:bg-gold/10 hover:border-gold/40 transition-colors"
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>
      <button
        type="button"
        onClick={() => scroll("next")}
        aria-label="Next review"
        className="absolute right-1 sm:-right-5 top-[40%] -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full bg-background border border-border/60 shadow-md hover:bg-gold/10 hover:border-gold/40 transition-colors"
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>
    </div>
  );
};

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

      <ReviewsCarousel />

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
