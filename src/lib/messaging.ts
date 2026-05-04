export type Platform = "web" | "instagram" | "messenger" | "whatsapp";

export const platformMeta: Record<Platform, { label: string; badge: string; dot: string }> = {
  web: {
    label: "Web",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
  },
  instagram: {
    label: "Instagram",
    badge: "bg-pink-100 text-pink-700 border-pink-200",
    dot: "bg-pink-500",
  },
  messenger: {
    label: "Messenger",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  whatsapp: {
    label: "WhatsApp",
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
