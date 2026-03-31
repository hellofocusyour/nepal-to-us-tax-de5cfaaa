import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CreditCard, Award, Calendar, Clock, CheckCircle } from "lucide-react";

interface StudentData {
  id: string;
  full_name: string;
  status: string;
  batch_id: string | null;
  batch?: { name: string; start_date: string; end_date: string };
}

interface PaymentSummary {
  total: number;
  verified: number;
  pending: number;
}

interface UpcomingSession {
  id: string;
  topic: string;
  session_date: string;
}

const statusColors: Record<string, string> = {
  inquired: "bg-muted text-muted-foreground",
  contacted: "bg-accent text-accent-foreground",
  enrolled: "bg-primary/10 text-primary",
  payment_received: "bg-green-100 text-green-700",
  active_student: "bg-primary text-primary-foreground",
  completed: "bg-secondary text-secondary-foreground",
  certified: "bg-secondary text-secondary-foreground",
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [payments, setPayments] = useState<PaymentSummary>({ total: 0, verified: 0, pending: 0 });
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Get student record
      const { data: studentData } = await supabase
        .from("students")
        .select("id, full_name, status, batch_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentData) { setLoading(false); return; }

      // Get batch info
      if (studentData.batch_id) {
        const { data: batch } = await supabase
          .from("batches")
          .select("name, start_date, end_date")
          .eq("id", studentData.batch_id)
          .single();
        if (batch) (studentData as StudentData).batch = batch;
      }

      setStudent(studentData as StudentData);

      // Get payments
      const { data: paymentData } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("student_id", studentData.id);

      if (paymentData) {
        setPayments({
          total: paymentData.reduce((sum, p) => sum + Number(p.amount), 0),
          verified: paymentData.filter(p => p.status === "verified").reduce((sum, p) => sum + Number(p.amount), 0),
          pending: paymentData.filter(p => p.status === "pending_verification").length,
        });
      }

      // Get upcoming sessions
      if (studentData.batch_id) {
        const { data: sessionData } = await supabase
          .from("class_sessions")
          .select("id, topic, session_date")
          .eq("batch_id", studentData.batch_id)
          .gte("session_date", new Date().toISOString().split("T")[0])
          .order("session_date")
          .limit(5);
        if (sessionData) setSessions(sessionData);
      }

      // Get attendance rate
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("present")
        .eq("student_id", studentData.id);

      if (attendanceData && attendanceData.length > 0) {
        const presentCount = attendanceData.filter(a => a.present).length;
        setAttendanceRate(Math.round((presentCount / attendanceData.length) * 100));
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Welcome, {student.full_name}!</h1>
        <p className="text-muted-foreground">Here's your learning overview</p>
      </div>

      {/* Status & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusColors[student.status] || "bg-muted"}>
                  {student.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-foreground">NPR {payments.verified.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attendance</p>
                <p className="text-lg font-bold text-foreground">{attendanceRate !== null ? `${attendanceRate}%` : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch</p>
                <p className="text-sm font-medium text-foreground">{student.batch?.name || "Not assigned"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Upcoming Sessions
          </CardTitle>
          <CardDescription>Your next classes</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming sessions scheduled.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{session.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.session_date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Payments Alert */}
      {payments.pending > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-destructive" />
              <p className="text-sm text-foreground">
                You have <strong>{payments.pending}</strong> payment(s) pending verification.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentDashboard;
