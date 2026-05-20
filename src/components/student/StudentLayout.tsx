import { useEffect, useState } from "react";
import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, CreditCard, Award, BookOpen, LogOut, Menu, X,
  GraduationCap, User, Megaphone, Users, Inbox as InboxIcon, Film
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "My Batch", href: "/portal/batch", icon: Users },
  { label: "My Courses", href: "/portal/my-courses", icon: BookOpen },
  { label: "Video Materials", href: "/portal/video-materials", icon: Film, paidOnly: true },
  { label: "Inbox", href: "/portal/inbox", icon: InboxIcon, badgeKey: "inbox" },
  { label: "Announcements", href: "/portal/announcements", icon: Megaphone, badgeKey: "announcements" },
  { label: "Payments", href: "/portal/payments", icon: CreditCard },
  { label: "Certificates", href: "/portal/certificates", icon: Award },
  { label: "Profile", href: "/portal/profile", icon: User },
];

const READ_KEY = "fa_read_announcements";

const StudentLayout = () => {
  const { user, isLoading, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: student } = await supabase.from("students")
        .select("id").eq("user_id", user.id).maybeSingle();
      if (!student) return;
      const { data: pays } = await supabase.from("payments")
        .select("installment_number, status")
        .eq("student_id", student.id).eq("status", "verified");
      setIsPaid((pays || []).some((p: any) => p.installment_number === 1));
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id")
        .order("created_at", { ascending: false });
      const readIds: string[] = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
      const unread = (data || []).filter(a => !readIds.includes(a.id));
      setUnreadCount(unread.length);
    };
    fetchUnread();
  }, [user, location.pathname]);

  // Inbox unread (admin replies = outbound msgs after last visit)
  useEffect(() => {
    if (!user) return;
    const conversationKey = `web:${user.id}`;
    const lastSeenKey = `fa_inbox_last_seen_${user.id}`;

    const fetchInboxUnread = async () => {
      if (location.pathname === "/portal/inbox") {
        localStorage.setItem(lastSeenKey, new Date().toISOString());
        setInboxUnread(0);
        return;
      }
      const lastSeen = localStorage.getItem(lastSeenKey) ?? new Date(0).toISOString();
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_key", conversationKey)
        .eq("direction", "outbound")
        .gt("created_at", lastSeen);
      setInboxUnread(count ?? 0);
    };
    fetchInboxUnread();

    const channel = supabase
      .channel(`student-inbox-badge-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_key=eq.${conversationKey}` },
        () => fetchInboxUnread()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/portal/login" replace />;

  return (
    <div className="min-h-screen bg-muted flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transform transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Focus Academy</h2>
            <p className="text-xs text-muted-foreground">Student Portal</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {baseNavItems.filter((i: any) => !i.paidOnly || isPaid).map((item: any) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/portal" && location.pathname.startsWith(item.href));
            const badgeValue =
              item.badgeKey === "announcements" ? unreadCount :
              item.badgeKey === "inbox" ? inboxUnread : 0;
            const showBadge = badgeValue > 0;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <Badge className="bg-destructive text-destructive-foreground h-5 px-1.5 text-xs">
                    {badgeValue}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={signOut}>
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 lg:px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
