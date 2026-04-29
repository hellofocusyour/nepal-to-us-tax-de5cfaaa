import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CreditCard,
  Calendar,
  CheckCircle,
  X,
  Megaphone,
  Mail,
  Download,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import PaymentModal from "@/components/student/PaymentModal";

import { FULL_PRICE, INSTALLMENT_TOTAL, type PaymentPlan } from "@/lib/pricing";

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
  const [progress, setProgress] = useState(0);
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
          typeof metadata.full_name === "string"
            ? metadata.full_name
            : typeof metadata.name === "string"
              ? metadata.name
              : user.email.split("@")[0];
        const phone = typeof metadata.phone === "string" ? metadata.phone : null;

        await supabase.functions.invoke("enroll-and-invite", {
          body: {
            full_name: fullName,
            email: user.email,
            phone,
            background: null,
            redirect_to: `${window.location.origin}/portal?onboarding=1`,
            send_invite: false,
            record_inquiry: true,
            preserve_existing_details: false,
          },
        });

        const { data: createdStudent } = await supabase
          .from("students")
          .select("id, full_name, status, batch_id, payment_plan")
          .eq("user_id", user.id)
          .maybeSingle();
        studentData = createdStudent;
      }

      if (!studentData) {
        setLoading(false);
        return;
      }

      if (studentData.batch_id) {
        const { data: batch } = await supabase
          .from("batches")
          .select("name, start_date, end_date")
          .eq("id", studentData.batch_id)
          .single();
        if (batch) (studentData as StudentData).batch = batch;

        const { data: nxt } = await supabase
          .from("class_sessions")
          .select("topic, session_date")
          .eq("batch_id", studentData.batch_id)
          .gte("session_date", new Date().toISOString().split("T")[0])
          .order("session_date")
          .limit(1)
          .maybeSingle();
        if (nxt) setNextSession(nxt);

        const { data: allSessions } = await supabase
          .from("class_sessions")
          .select("session_date")
          .eq("batch_id", studentData.batch_id);
        if (allSessions && allSessions.length > 0) {
          const past = allSessions.filter((s) => new Date(s.session_date) <= new Date()).length;
          setProgress(Math.round((past / allSessions.length) * 100));
        }
      }

      setStudent(studentData as StudentData);

      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("student_id", studentData.id);
      if (payments) {
        setPaid(payments.filter((p) => p.status === "verified").reduce((s, p) => s + Number(p.amount), 0));
        setPendingCount(payments.filter((p) => p.status === "pending_verification").length);
      }

      // Latest unread announcement
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
      <div className="flex items-center justify-center h-64">
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
  const isFirstTime = paid === 0 && pendingCount === 0;

  return (
    <div className="space-y-6">
      {/* Announcement banner */}
      {banner && (
        <div className="flex items-start gap-3 rounded-lg bg-primary text-primary-foreground p-4">
          <Megaphone className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{banner.title}</p>
            <p className="text-xs opacity-90 line-clamp-1">{banner.content}</p>
          </div>
          <Button asChild size="sm" variant="secondary" className="shrink-0">
            <Link to="/portal/announcements">View</Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 hover:bg-primary-foreground/10 text-primary-foreground"
            onClick={dismissBanner}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-muted-foreground">Here's what's happening with you today</p>
      </div>

      {isFirstTime ? (
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="pt-6 text-center space-y-4 py-12">
            <Sparkles className="w-12 h-12 mx-auto text-primary" />
            <h2 className="text-xl font-display font-bold text-foreground">Let's get you started</h2>
            <p className="text-sm text-muted-foreground">Book your first course to begin your journey.</p>
            <Button onClick={() => setPayOpen(true)}>Book your first course →</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={BookOpen} label="Course" value="US Taxation" sub={student.batch?.name || "No batch"} />
          <MetricCard
            icon={Calendar}
            label="Next class"
            value={nextSession?.topic || "—"}
            sub={
              nextSession
                ? new Date(nextSession.session_date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "No class scheduled"
            }
          />
          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Progress</p>
              </div>
              <p className="text-xl font-bold text-foreground">{progress}%</p>
              <Progress value={progress} className="h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment</p>
              </div>
              {remaining === 0 ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Paid in full</Badge>
              ) : (
                <>
                  <p className="text-xl font-bold text-destructive">Rs. {remaining.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">due next</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Continue learning + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Continue learning</p>
              <h3 className="font-display font-semibold text-foreground mt-1">
                {nextSession?.topic || "Module 1 — US Tax Fundamentals"}
              </h3>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <PlayCircle className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Current lesson</span>
              </div>
              <Button size="sm" asChild>
                <Link to="/portal/syllabus">Resume</Link>
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Next module locked</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Quick actions</p>
            <Button variant="outline" className="w-full justify-start" onClick={() => setPayOpen(true)}>
              <CreditCard className="w-4 h-4 mr-2" /> Make a payment
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="mailto:focusyourfinanceofficial@gmail.com">
                <Mail className="w-4 h-4 mr-2" /> For any inquiry Mail at "hello@focusyourfinance.com"
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/portal/syllabus">
                <Download className="w-4 h-4 mr-2" /> Download syllabus
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {pendingCount > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-foreground">
                You have <strong>{pendingCount}</strong> payment(s) pending verification.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <PaymentModal open={payOpen} onOpenChange={setPayOpen} studentId={student.id} />
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  sub: string;
}) => (
  <Card>
    <CardContent className="pt-6 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-base font-semibold text-foreground line-clamp-1">{value}</p>
      <p className="text-xs text-muted-foreground line-clamp-1">{sub}</p>
    </CardContent>
  </Card>
);

export default StudentDashboard;
