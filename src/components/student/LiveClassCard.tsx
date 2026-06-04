import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Calendar as CalendarIcon, ExternalLink, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { computeNextOccurrence } from "@/lib/liveClassSchedule";

interface Settings {
  meet_link: string;
  class_title: string;
  class_description: string | null;
  next_class_at: string | null;
  duration_minutes: number;
  enabled: boolean;
  recurrence_enabled?: boolean;
  recurrence_days?: number[];
  recurrence_time?: string;
}


function pad(n: number) { return n.toString().padStart(2, "0"); }
function toGcalUtc(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
}
function googleCalendarUrl(s: Settings) {
  if (!s.next_class_at) return "#";
  const start = new Date(s.next_class_at);
  const end = new Date(start.getTime() + s.duration_minutes * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: s.class_title,
    dates: `${toGcalUtc(start)}/${toGcalUtc(end)}`,
    details: `${s.class_description || ""}\n\nJoin: ${s.meet_link}`,
    location: s.meet_link,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  return diff;
}

const LiveClassCard = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (student) {
        const { data: pays } = await supabase.from("payments")
          .select("installment_number, status").eq("student_id", student.id).eq("status", "verified");
        setHasAccess((pays || []).some(p => p.installment_number === 1));
      }
      const { data: settings } = await supabase.from("live_class_settings" as any)
        .select("meet_link, class_title, class_description, next_class_at, duration_minutes, enabled, recurrence_enabled, recurrence_days, recurrence_time")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (settings) setS(settings as any as Settings);
      setLoading(false);
    })();
  }, []);

  const effectiveNext = s?.recurrence_enabled
    ? computeNextOccurrence(s.recurrence_days || [], s.recurrence_time || "19:00", s.duration_minutes)
    : (s?.next_class_at ?? null);

  const diff = useCountdown(effectiveNext);

  if (loading || !s || !s.enabled || !effectiveNext || !s.meet_link || !hasAccess) return null;


  const start = new Date(effectiveNext);
  const end = new Date(start.getTime() + s.duration_minutes * 60000);
  const isLive = diff !== null && diff <= 0 && Date.now() < end.getTime();
  const isPast = Date.now() >= end.getTime();
  if (isPast) return null;

  let countdownLabel = "";
  if (diff !== null) {
    if (isLive) countdownLabel = "Live now";
    else {
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hrs = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      if (days > 0) countdownLabel = `${days}d ${hrs}h ${mins}m`;
      else if (hrs > 0) countdownLabel = `${hrs}h ${mins}m ${pad(secs)}s`;
      else countdownLabel = `${mins}m ${pad(secs)}s`;
    }
  }

  const dateStr = start.toLocaleString("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "long", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  return (
    <Card className="relative overflow-hidden border-0 shadow-2xl animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-secondary" />
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-secondary/40 blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-primary-light/50 blur-3xl" />
      {isLive && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          <Badge className="bg-red-500 text-white border-0">LIVE NOW</Badge>
        </div>
      )}
      <CardContent className="relative p-6 lg:p-8 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Video className="w-5 h-5" />
          </div>
          <Badge className="bg-white/20 hover:bg-white/20 text-white border-white/30 backdrop-blur">
            {isLive ? "Class in session" : "Upcoming Live Class"}
          </Badge>
        </div>

        <h2 className="text-2xl lg:text-3xl font-display font-bold mb-2">{s.class_title}</h2>
        {s.class_description && (
          <p className="opacity-90 text-sm lg:text-base mb-4 max-w-xl">{s.class_description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-5 text-sm">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-3 py-2 border border-white/15">
            <CalendarIcon className="w-4 h-4" />
            <span>{dateStr} (NPT)</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-3 py-2 border border-white/15">
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{countdownLabel}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg" className={`gap-2 font-semibold shadow-lg ${isLive ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-white text-primary hover:bg-white/90"}`}>
            <a href={s.meet_link} target="_blank" rel="noopener noreferrer">
              <Video className="w-5 h-5" />
              {isLive ? "Join now" : "Join class"}
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur">
            <a href={googleCalendarUrl(s)} target="_blank" rel="noopener noreferrer">
              <CalendarIcon className="w-5 h-5" /> Add to Google Calendar
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveClassCard;
