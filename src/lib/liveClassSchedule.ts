// Helpers for computing the next occurrence of a recurring live class in Asia/Kathmandu (NPT, UTC+05:45).

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) { return n.toString().padStart(2, "0"); }

// Get NPT calendar date parts for a given UTC instant
function nptParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    weekday: "short", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: parseInt(parts.year), m: parseInt(parts.month), d: parseInt(parts.day),
    dow: weekdayMap[parts.weekday as string],
  };
}

// Convert NPT "YYYY-MM-DD HH:MM" to UTC ISO
export function nptToIso(y: number, m: number, d: number, hh: number, mm: number): string {
  return new Date(`${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00+05:45`).toISOString();
}

// Given recurrence_days (0-6, Sun..Sat) and recurrence_time "HH:MM" NPT, return next class start ISO.
export function computeNextOccurrence(
  recurrenceDays: number[],
  recurrenceTime: string,
  durationMinutes: number,
  now: Date = new Date(),
): string | null {
  if (!recurrenceDays || recurrenceDays.length === 0) return null;
  const [hh, mm] = recurrenceTime.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  // Iterate next 14 days (in NPT) and find first matching day where end > now
  for (let i = 0; i < 14; i++) {
    const probe = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const p = nptParts(probe);
    if (!recurrenceDays.includes(p.dow)) continue;
    const iso = nptToIso(p.y, p.m, p.d, hh, mm);
    const startMs = new Date(iso).getTime();
    const endMs = startMs + durationMinutes * 60000;
    if (endMs > now.getTime()) return iso;
  }
  return null;
}
