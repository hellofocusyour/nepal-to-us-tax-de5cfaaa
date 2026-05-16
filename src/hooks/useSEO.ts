import { useEffect } from "react";

type FAQItem = { q: string; a: string };

type SEOProps = {
  title: string;
  description: string;
  path: string; // e.g. "/privacy-policy"
  type?: "website" | "article";
  noIndex?: boolean;
  faqs?: FAQItem[];
};

const SITE = "https://academy.focusyourfinance.com";

const upsertMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const upsertJsonLd = (id: string, data: Record<string, unknown>) => {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
};

const removeJsonLd = (id: string) => {
  const el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (el) el.remove();
};

export const useSEO = ({ title, description, path, type = "article", noIndex = false, faqs }: SEOProps) => {
  useEffect(() => {
    const url = `${SITE}${path}`;
    document.title = title;

    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex
        ? "noindex, nofollow"
        : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    );

    upsertLink("canonical", url);

    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", "Focus Academy");

    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    upsertJsonLd("page-jsonld", {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url,
      isPartOf: {
        "@type": "WebSite",
        name: "Focus Academy",
        url: SITE,
      },
      publisher: {
        "@type": "Organization",
        name: "Focus Academy",
        url: SITE,
      },
    });

    if (faqs && faqs.length > 0) {
      upsertJsonLd("faq-jsonld", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      });
    } else {
      removeJsonLd("faq-jsonld");
    }
  }, [title, description, path, type, noIndex, faqs]);
};
