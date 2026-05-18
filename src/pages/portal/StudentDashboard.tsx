import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, CreditCard, Calendar, CheckCircle, X, Megaphone, Mail,
  Download, PlayCircle, Sparkles, Clock, Award, TrendingUp, Users,
  ArrowRight, Target, Flame, GraduationCap,
} from "lucide-react";
import { Link } from "react-router-dom";
import PaymentModal from "@/components/student/PaymentModal";
import LiveClassCard from "@/components/student/LiveClassCard";
import { FULL_PRICE, INSTALLMENT_TOTAL, type PaymentPlan } from "@/lib/pricing";
import { format, differenceInDays } from "date-fns";

interface StudentData {
  id: string;
  full_name: string;
  status: string;
  batch_id: string | null;
  payment_plan: PaymentPlan;
  batch?: { name: string; start_date: string; end_date: string };
}

const READ_KEY = "fa_read_announcements";
const DISMISS_KEY = "fa_dismissed_banner";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [paid, setPaid] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [nextSession, setNextSession] = useState<{ topic: string; session_date: string } | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<{ topic: string; session_date: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [banner, setBanner] = useState<{ id: string; title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("onboarding") === "1") {
      setPayOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let { data: studentData } = await supabase
        .from("students")
        .select("id, full_name, status, batch_id, payment_plan")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentData && user.email) {
        const metadata = user.user_metadata ?? {};
        const fullName =
          typeof metadata.full_name === "string" ? metadata.full_name :
          typeof metadata.name === "string" ? metadata.name :
          user.email.split("@")[0];
        const phone = typeof metadata.phone === "string" ? metadata.phone : null;

        await supabase.functions.invoke("enroll-and-invite", {
          body: {
            full_name: fullName, email: user.email, phone, background: null,
            redirect_to: `${window.location.origin}/portal?onboarding=1`,
            send_invite: false, record_inquiry: true, preserve_existing_details: false,
          },
        });

        const { data: createdStudent } = await supabase
          .from("students")
          .select("id, full_name, status, batch_id, payment_plan")
          .eq("user_id", user.id)
          .maybeSingle();
        studentData = createdStudent;
      }

      if (!studentData) { setLoading(false); return; }

      if (studentData.batch_id) {
        const { data: batch } = await supabase
          .from("batches")
          .select("name, start_date, end_date")
          .eq("id", studentData.batch_id)
          .single();
        if (batch) (studentData as StudentData).batch = batch;
      }

      setStudent(studentData as StudentData);

      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("student_id", studentData.id);
      const isPaid = !!payments?.some((p) => p.status === "verified");
      if (payments) {
        setPaid(payments.filter((p) => p.status === "verified").reduce((s, p) => s + Number(p.amount), 0));
        setPendingCount(payments.filter((p) => p.status === "pending_verification").length);
      }

      // Next Class — from live_class_settings (weekly Mon–Fri)
      const { data: lcs } = await supabase
        .from("live_class_settings")
        .select("class_title, next_class_at, enabled")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lcs?.enabled && lcs.next_class_at) {
        const base = new Date(lcs.next_class_at);
        const now = new Date();
        const occurrences: { topic: string; session_date: string }[] = [];
        // Walk forward day by day; include weekdays (Mon–Fri) at same time-of-day
        const cursor = new Date(base);
        // If configured time already passed today, start from now
        if (cursor < now) {
          cursor.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
          if (cursor < now) cursor.setDate(cursor.getDate() + 1);
        }
        let safety = 0;
        while (occurrences.length < 4 && safety < 20) {
          const day = cursor.getDay(); // 0=Sun..6=Sat
          if (day >= 1 && day <= 5) {
            occurrences.push({ topic: lcs.class_title, session_date: cursor.toISOString() });
          }
          cursor.setDate(cursor.getDate() + 1);
          safety++;
        }
        if (occurrences.length > 0) {
          setNextSession(occurrences[0]);
          setUpcomingSessions(occurrences);
        }
      }

      // Sessions Done — modules unlocked (paid users only)
      if (isPaid) {
        const { data: modules } = await supabase
          .from("course_modules")
          .select("is_unlocked");
        if (modules && modules.length > 0) {
          const unlocked = modules.filter((m) => m.is_unlocked).length;
          setCompletedCount(unlocked);
          setTotalCount(modules.length);
          setProgress(Math.round((unlocked / modules.length) * 100));
        }
      }

      const { data: ann } = await supabase
        .from("announcements")
        .select("id, title, content")
        .order("created_at", { ascending: false })
        .limit(5);
      const readIds: string[] = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
      const dismissed: string[] = JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]");
      const unread = (ann || []).find((a) => !readIds.includes(a.id) && !dismissed.includes(a.id));
      if (unread) setBanner(unread);

      setLoading(false);
    })();
  }, [user]);

  const dismissBanner = () => {
    if (!banner) return;
    const dismissed: string[] = JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]");
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed, banner.id]));
    setBanner(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-16 space-y-4">
        <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-display text-foreground">Welcome to Focus Academy!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your student profile hasn't been set up yet. Please contact admin or submit an inquiry through our website.
        </p>
      </div>
    );
  }

  const firstName = student.full_name.split(" ")[0];
  const totalDue = student.payment_plan === "installment" ? INSTALLMENT_TOTAL : FULL_PRICE;
  const remaining = Math.max(totalDue - paid, 0);
  const paidPct = totalDue > 0 ? Math.min(Math.round((paid / totalDue) * 100), 100) : 0;
  const isFirstTime = paid === 0 && pendingCount === 0;
  const daysToNextClass = nextSession
    ? differenceInDays(new Date(nextSession.session_date), new Date())
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live class card (paid students only) */}
      <LiveClassCard />

      {/* Announcement banner */}
      {banner && (
        <div className="flex items-start gap-3 rounded-xl bg-gradient-to-r from-primary to-primary-light text-primary-foreground p-4 shadow-lg">
          <Megaphone className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{banner.title}</p>
            <p className="text-xs opacity-90 line-clamp-1">{banner.content}</p>
          </div>
          <Button asChild size="sm" variant="secondary" className="shrink-0">
            <Link to="/portal/announcements">View</Link>
          </Button>
          <Button size="icon" variant="ghost" className="shrink-0 hover:bg-white/15 text-primary-foreground" onClick={dismissBanner}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 lg:p-8 text-primary-foreground">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-secondary/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 w-80 h-80 rounded-full bg-primary-light/30 blur-3xl" />
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-3">
            <Badge className="bg-white/15 hover:bg-white/15 text-white border border-white/20 backdrop-blur">
              <Flame className="w-3 h-3 mr-1" /> Keep your momentum
            </Badge>
            <h1 className="text-2xl lg:text-4xl font-display font-bold">
              Welcome back, {firstName}
            </h1>
            <p className="opacity-85 text-sm lg:text-base">
              {format(new Date(), "EEEE, MMMM d")} ·{" "}
              {nextSession
                ? daysToNextClass === 0 ? "You have a class today" :
                  daysToNextClass === 1 ? "Your next class is tomorrow" :
                  `Next class in ${daysToNextClass} days`
                : "No classes scheduled"}
            </p>
          </div>
          {!isFirstTime && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs opacity-80 uppercase tracking-wide">Course Progress</span>
                <span className="text-2xl font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
              <p className="text-xs opacity-80 mt-2">
                {completedCount} of {totalCount} sessions completed
              </p>
            </div>
          )}
        </div>
      </div>

      {isFirstTime ? (
        <Card className="bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-secondary/20 blur-3xl" />
          <CardContent className="pt-6 text-center space-y-4 py-12 relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">Let's get you started</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Book your seat to unlock the curriculum, live sessions, and certified mentor support.
            </p>
            <Button size="lg" onClick={() => setPayOpen(true)} className="gap-2">
              Book your first course <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={Calendar}
              label="Next Class"
              value={nextSession?.topic || "—"}
              sub={
                nextSession
                  ? format(new Date(nextSession.session_date), "EEE, MMM d · h:mm a")
                  : "Nothing scheduled"
              }
              gradient="from-violet-500/10 to-violet-500/5"
              iconBg="bg-violet-500/15 text-violet-600"
            />
            <StatCard
              icon={Target}
              label="Modules Unlocked"
              value={`${completedCount}/${totalCount || "—"}`}
              sub={`${progress}% complete`}
              gradient="from-emerald-500/10 to-emerald-500/5"
              iconBg="bg-emerald-500/15 text-emerald-600"
            />

            <Card className={`relative overflow-hidden border-border bg-gradient-to-br ${remaining === 0 ? "from-emerald-500/10 to-emerald-500/5" : "from-amber-500/10 to-amber-500/5"}`}>
              <CardContent className="p-5 space-y-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${remaining === 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment</p>
                  {remaining === 0 ? (
                    <>
                      <p className="text-lg font-bold text-emerald-700 mt-1">Paid in full</p>
                      <p className="text-xs text-muted-foreground">Rs. {paid.toLocaleString()}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-foreground mt-1">Rs. {remaining.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{paidPct}% paid</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Continue learning + Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 p-5 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Continue Learning</p>
                    <h3 className="font-display font-bold text-foreground text-lg mt-1">
                      {nextSession?.topic || "Module 1 — US Tax Fundamentals"}
                    </h3>
                  </div>
                  <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary/15 text-primary items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
              </div>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <PlayCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Current lesson</p>
                      <p className="text-xs text-muted-foreground">Resume where you left off</p>
                    </div>
                  </div>
                  <Button size="sm" asChild className="gap-1 group-hover:gap-2 transition-all">
                    <Link to="/portal/syllabus">Resume <ArrowRight className="w-3 h-3" /></Link>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/portal/my-courses" className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all">
                    <BookOpen className="w-4 h-4 text-primary mb-2" />
                    <p className="text-sm font-medium text-foreground">My Courses</p>
                    <p className="text-xs text-muted-foreground">Browse modules</p>
                  </Link>
                  <Link to="/portal/certificates" className="p-3 rounded-lg border border-border hover:border-secondary/50 hover:bg-muted/30 transition-all">
                    <Award className="w-4 h-4 text-secondary mb-2" />
                    <p className="text-sm font-medium text-foreground">Certificates</p>
                    <p className="text-xs text-muted-foreground">Your achievements</p>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Upcoming Schedule</p>
                  <Link to="/portal/batch" className="text-xs text-primary hover:underline">View all</Link>
                </div>
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No classes scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingSessions.map((s, i) => {
                      const d = new Date(s.session_date);
                      const isToday = differenceInDays(d, new Date()) === 0;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${isToday ? "bg-primary/10 border border-primary/30" : "bg-muted/40"}`}>
                          <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 ${isToday ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                            <span className="text-[10px] uppercase font-medium leading-none">{format(d, "MMM")}</span>
                            <span className="text-base font-bold leading-none mt-0.5">{format(d, "d")}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{s.topic}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {isToday ? "Today" : format(d, "EEE")} · {format(d, "h:mm a")}
                            </p>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick actions row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setPayOpen(true)}
              className="group p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <p className="font-semibold text-foreground text-sm">Make a Payment</p>
              <p className="text-xs text-muted-foreground mt-0.5">Settle your balance</p>
            </button>
            <Link
              to="/portal/syllabus"
              className="group p-5 rounded-xl border border-border bg-card hover:border-secondary/50 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/20 text-secondary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <p className="font-semibold text-foreground text-sm">Download Syllabus</p>
              <p className="text-xs text-muted-foreground mt-0.5">Full course outline</p>
            </Link>
            <a
              href="mailto:hello@focusyourfinance.com"
              className="group p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <p className="font-semibold text-foreground text-sm">Get Support</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">hello@focusyourfinance.com</p>
            </a>
          </div>
        </>
      )}

      {pendingCount > 0 && (
        <Card className="border-amber-400/40 bg-gradient-to-r from-amber-50 to-amber-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {pendingCount} payment{pendingCount > 1 ? "s" : ""} awaiting verification
                </p>
                <p className="text-xs text-muted-foreground">We'll notify you once approved (typically within 24 hours).</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/portal/payments">View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <PaymentModal open={payOpen} onOpenChange={setPayOpen} studentId={student.id} />
    </div>
  );
};

const StatCard = ({
  icon: Icon, label, value, sub, gradient, iconBg,
}: {
  icon: typeof BookOpen; label: string; value: string; sub: string;
  gradient: string; iconBg: string;
}) => (
  <Card className={`relative overflow-hidden border-border bg-gradient-to-br ${gradient} hover:shadow-md transition-shadow`}>
    <CardContent className="p-5 space-y-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-base lg:text-lg font-bold text-foreground line-clamp-1 mt-1">{value}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{sub}</p>
      </div>
    </CardContent>
  </Card>
);

export default StudentDashboard;
