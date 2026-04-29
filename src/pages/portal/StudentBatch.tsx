import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Mail, Video, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import PaidAccessGate from "@/components/student/PaidAccessGate";

interface BatchInfo {
  name: string;
  start_date: string;
  end_date: string;
  enrolled_count: number;
  classmateCount: number;
  nextSession?: { topic: string; session_date: string };
}

const StudentBatch = () => {
  const { user } = useAuth();
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: student } = await supabase.from("students")
        .select("batch_id").eq("user_id", user.id).maybeSingle();
      if (!student?.batch_id) { setLoading(false); return; }

      const { data: b } = await supabase.from("batches")
        .select("name, start_date, end_date, enrolled_count")
        .eq("id", student.batch_id).single();
      if (!b) { setLoading(false); return; }

      const { data: nxt } = await supabase.from("class_sessions")
        .select("topic, session_date")
        .eq("batch_id", student.batch_id)
        .gte("session_date", new Date().toISOString().split("T")[0])
        .order("session_date").limit(1).maybeSingle();

      setBatch({
        name: b.name,
        start_date: b.start_date,
        end_date: b.end_date,
        enrolled_count: b.enrolled_count,
        classmateCount: Math.max((b.enrolled_count || 1) - 1, 0),
        nextSession: nxt || undefined,
      });
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (!batch) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <Users className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">You're not assigned to a batch yet.</p>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const end = new Date(batch.end_date);
  const weeksLeft = Math.max(Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)), 0);
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // class days demo: Mon, Wed, Fri at 7pm
  const classDays = [1, 3, 5];
  const classTime = "7:00 PM";

  return (
    <PaidAccessGate>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">{batch.name}</h1>
        <p className="text-muted-foreground">Your cohort schedule and instructors</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Started" value={fmt(batch.start_date)} />
        <Stat label="Ends" value={fmt(batch.end_date)} />
        <Stat label="Classmates" value={batch.classmateCount.toString()} />
        <Stat label="Weeks left" value={weeksLeft.toString()} highlight={weeksLeft <= 2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instructor */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Instructor</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground">Lead Mentor</h3>
                <p className="text-xs text-muted-foreground">Lead instructor</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">IRS Enrolled Agent</Badge>
              <Badge variant="outline">8+ years US tax</Badge>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <a href="mailto:focusyourfinanceofficial@gmail.com">
                <Mail className="w-4 h-4 mr-2" /> Send message
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Next class */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Next class</p>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                {batch.nextSession ? "Upcoming" : "TBA"}
              </Badge>
            </div>
            {batch.nextSession ? (
              <>
                <div>
                  <h3 className="font-display font-semibold text-foreground">{batch.nextSession.topic}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(batch.nextSession.session_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {classTime}
                  </p>
                </div>
                <Button className="w-full" disabled>
                  <Video className="w-4 h-4 mr-2" /> Join Zoom class
                </Button>
                <p className="text-xs text-muted-foreground text-center">Link unlocks 15 min before class</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No class scheduled yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly schedule */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Weekly schedule</p>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
              const isClassDay = classDays.includes(i + 1);
              return (
                <div
                  key={d}
                  className={cn(
                    "rounded-lg p-3 text-center text-xs sm:text-sm",
                    isClassDay
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <p className="font-semibold">{d}</p>
                  <p className="mt-1 text-xs">{isClassDay ? classTime : "—"}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
    </PaidAccessGate>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <Card>
    <CardContent className="pt-6 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-base sm:text-lg font-display font-bold", highlight ? "text-destructive" : "text-foreground")}>
        {value}
      </p>
    </CardContent>
  </Card>
);

export default StudentBatch;
