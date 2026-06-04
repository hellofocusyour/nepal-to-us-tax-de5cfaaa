import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

const READ_KEY = "fa_read_announcements";

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  created_at: string;
  expires_at: string | null;
}

type Filter = "all" | "unread" | "class" | "payment" | "general";

const categoryFor = (a: Announcement): "class" | "payment" | "general" => {
  const t = (a.title + " " + a.content).toLowerCase();
  if (t.includes("class") || t.includes("schedule") || t.includes("zoom")) return "class";
  if (t.includes("pay") || t.includes("fee") || t.includes("install")) return "payment";
  return "general";
};

const categoryStyle = {
  class: { border: "border-l-amber-500", pill: "bg-amber-100 text-amber-700" },
  payment: { border: "border-l-blue-500", pill: "bg-blue-100 text-blue-700" },
  general: { border: "border-l-primary", pill: "bg-primary/10 text-primary" },
};

const relTime = (iso: string) => {
  const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return d.toLocaleDateString();
};

const StudentAnnouncements = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: student } = await supabase.from("students")
        .select("status").eq("user_id", user.id).maybeSingle();
      const isActive = student?.status === "active_student";
      const { data } = await supabase.from("announcements")
        .select("*").order("created_at", { ascending: false });
      const filtered = (data || []).filter(a => {
        const aud = (a.target_audience || "all").toLowerCase();
        if (aud === "all") return true;
        if (aud === "active") return isActive;
        if (aud === "enrolled") return !isActive;
        return true;
      });
      setList(filtered);
      setReadIds(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
      setLoading(false);
    })();
  }, [user]);

  const markRead = (id: string) => {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    localStorage.setItem(READ_KEY, JSON.stringify(next));
  };

  const open = (a: Announcement) => { setActive(a); markRead(a.id); };

  const filtered = list.filter(a => {
    if (filter === "all") return true;
    if (filter === "unread") return !readIds.includes(a.id);
    return categoryFor(a) === filter;
  });

  const unreadCount = list.filter(a => !readIds.includes(a.id)).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Announcements</h1>
        <p className="text-muted-foreground">Updates from your instructor and admin</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          { k: "all", label: "All" },
          { k: "unread", label: `Unread${unreadCount ? ` (${unreadCount})` : ""}` },
          { k: "class", label: "Class change" },
          { k: "payment", label: "Payment" },
          { k: "general", label: "General" },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k as Filter)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              filter === t.k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Inbox className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              {list.length === 0 ? "No announcements yet — check back soon." : "Nothing here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const cat = categoryFor(a);
            const style = categoryStyle[cat];
            const isRead = readIds.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => open(a)}
                className={cn(
                  "w-full text-left rounded-lg border bg-card border-l-4 p-4 transition-all hover:shadow-md",
                  style.border,
                  isRead && "opacity-75"
                )}
              >
                <div className="flex items-start gap-3">
                  {!isRead && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{a.title}</h3>
                      <Badge className={cn(style.pill, "hover:" + style.pill)}>{cat === "class" ? "Class change" : cat}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{a.content}</p>
                    <p className="text-xs text-muted-foreground">Posted by admin · {relTime(a.created_at)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" /> {active.title}
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">{relTime(active.created_at)}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{active.content}</p>
              <Button onClick={() => setActive(null)}>Close</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAnnouncements;
