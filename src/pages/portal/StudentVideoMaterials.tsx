import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PaidAccessGate from "@/components/student/PaidAccessGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { driveEmbedUrl } from "@/lib/driveUrl";
import { PlayCircle, Clock, X, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Video = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  drive_file_id: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
};

const TERMS_VERSION = "v1";
const SESSION_AGREED_KEY = "fa_video_terms_agreed_session";

const TERMS_TEXT = `These videos are licensed exclusively for your personal study as an enrolled Focus Academy student.
You agree NOT to download, screen-record, redistribute, or share access in any form. All sessions are watermarked
with your email address and timestamp. Unauthorized sharing will result in immediate access revocation and may
trigger legal action.`;

const Watermark = ({ email }: { email: string }) => {
  const [now, setNow] = useState(new Date());
  const [corner, setCorner] = useState(0); // 0 TL, 1 TR, 2 BR, 3 BL
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setCorner((c) => (c + 1) % 4), 9000);
    return () => clearInterval(t);
  }, []);
  const positions = [
    "top-4 left-4", "top-4 right-4", "bottom-4 right-4", "bottom-4 left-4",
  ];
  return (
    <div
      className={`pointer-events-none absolute ${positions[corner]} text-xs font-mono text-white select-none transition-all duration-700`}
      style={{ opacity: 0.35, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
    >
      {email} • {now.toLocaleTimeString([], { hour12: false })}
    </div>
  );
};

const Inner = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Video | null>(null);
  const [needsAck, setNeedsAck] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [hasDbAck, setHasDbAck] = useState<boolean | null>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("video_materials")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setVideos((data as Video[]) || []);
      setLoading(false);

      if (user) {
        const { data: ack } = await supabase
          .from("video_terms_acknowledgments")
          .select("id")
          .eq("user_id", user.id)
          .eq("terms_version", TERMS_VERSION)
          .maybeSingle();
        setHasDbAck(!!ack);
      }
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const map: Record<string, Video[]> = {};
    videos.forEach((v) => { (map[v.category] ||= []).push(v); });
    return map;
  }, [videos]);

  const openVideo = (v: Video) => {
    const sessionAgreed = sessionStorage.getItem(SESSION_AGREED_KEY) === TERMS_VERSION;
    setActive(v);
    if (!sessionAgreed) setNeedsAck(true);
    // log access (best effort)
    if (user) {
      supabase.from("video_access_logs").insert({
        user_id: user.id,
        video_id: v.id,
        user_agent: navigator.userAgent,
      }).then(({ error }) => { if (error) console.warn("access log:", error.message); });
    }
  };

  const agree = async () => {
    setAckLoading(true);
    if (user && !hasDbAck) {
      const { error } = await supabase
        .from("video_terms_acknowledgments")
        .insert({ user_id: user.id, terms_version: TERMS_VERSION });
      if (error && !error.message.includes("duplicate")) {
        toast.error(error.message); setAckLoading(false); return;
      }
      setHasDbAck(true);
    }
    sessionStorage.setItem(SESSION_AGREED_KEY, TERMS_VERSION);
    setNeedsAck(false);
    setAckLoading(false);
  };

  // Block right-click and devtool-ish shortcuts on player
  useEffect(() => {
    if (!active) return;
    const blockKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        (e.ctrlKey && ["s", "u", "p"].includes(k)) ||
        (e.ctrlKey && e.shiftKey && ["i", "c", "j"].includes(k)) ||
        k === "f12"
      ) { e.preventDefault(); }
    };
    const blockCtx = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("keydown", blockKey);
    window.addEventListener("contextmenu", blockCtx);
    return () => {
      window.removeEventListener("keydown", blockKey);
      window.removeEventListener("contextmenu", blockCtx);
    };
  }, [active]);

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Video Materials</h1>
        <p className="text-sm text-muted-foreground">Recorded sessions and resources for enrolled students.</p>
      </div>

      {videos.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No videos available yet.</CardContent></Card>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((v) => (
                <Card key={v.id} className="cursor-pointer group hover:shadow-lg transition-shadow" onClick={() => openVideo(v)}>
                  <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden flex items-center justify-center">
                    {v.thumbnail_url ? (
                      <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="w-12 h-12 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <PlayCircle className="w-14 h-14 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <CardContent className="py-3">
                    <h3 className="font-semibold text-foreground line-clamp-2">{v.title}</h3>
                    {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {v.duration_minutes && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{v.duration_minutes} min
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(v.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent className="max-w-6xl p-0 overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
          {active && (
            <div className="bg-black">
              <div className="flex items-center justify-between px-4 py-2 bg-card">
                <h3 className="font-semibold text-foreground truncate">{active.title}</h3>
                <Button size="icon" variant="ghost" onClick={() => setActive(null)}><X className="w-4 h-4" /></Button>
              </div>
              <div ref={playerWrapRef} className="relative w-full aspect-video bg-black">
                {!needsAck && (
                  <iframe
                    src={driveEmbedUrl(active.drive_file_id)}
                    allow="autoplay"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                    title={active.title}
                  />
                )}
                {!needsAck && user?.email && <Watermark email={user.email} />}
                {needsAck && (
                  <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-6 z-10">
                    <div className="max-w-lg space-y-4 text-center">
                      <h3 className="font-display text-xl font-bold text-foreground">Viewing Agreement</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line text-left">{TERMS_TEXT}</p>
                      <Button onClick={agree} disabled={ackLoading} className="w-full">
                        {ackLoading ? "Saving…" : "I Agree — Start Watching"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 py-2 bg-card text-xs text-muted-foreground border-t border-border">
                This video is for your personal study only. Downloading, recording, or sharing is prohibited and tracked.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StudentVideoMaterials = () => (
  <PaidAccessGate><Inner /></PaidAccessGate>
);

export default StudentVideoMaterials;
