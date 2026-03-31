import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle, XCircle, PlayCircle } from "lucide-react";

interface SessionWithAttendance {
  id: string;
  topic: string;
  session_date: string;
  recording_link: string | null;
  notes: string | null;
  attended?: boolean;
}

const StudentCourses = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithAttendance[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCourseData = async () => {
      const { data: student } = await supabase
        .from("students")
        .select("id, batch_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!student?.batch_id) { setLoading(false); return; }
      setStudentId(student.id);

      const { data: batch } = await supabase.from("batches").select("name").eq("id", student.batch_id).single();
      if (batch) setBatchName(batch.name);

      const { data: sessionData } = await supabase
        .from("class_sessions")
        .select("id, topic, session_date, recording_link, notes")
        .eq("batch_id", student.batch_id)
        .order("session_date");

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("session_id, present")
        .eq("student_id", student.id);

      const attendanceMap = new Map(attendanceData?.map(a => [a.session_id, a.present]) || []);

      const enriched = (sessionData || []).map(s => ({
        ...s,
        attended: attendanceMap.get(s.id),
      }));

      setSessions(enriched);
      setLoading(false);
    };
    fetchCourseData();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const pastSessions = sessions.filter(s => new Date(s.session_date) <= new Date());
  const attendedCount = pastSessions.filter(s => s.attended === true).length;
  const progressPercent = pastSessions.length > 0 ? Math.round((pastSessions.length / sessions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Courses</h1>
        <p className="text-muted-foreground">Track your learning progress</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No course sessions found. You may not be assigned to a batch yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle>{batchName}</CardTitle>
              <CardDescription>Course progress: {pastSessions.length} of {sessions.length} sessions completed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPercent} className="h-3" />
              <div className="flex gap-6 text-sm">
                <span className="text-muted-foreground">Attended: <strong className="text-foreground">{attendedCount}/{pastSessions.length}</strong></span>
                <span className="text-muted-foreground">Remaining: <strong className="text-foreground">{sessions.length - pastSessions.length}</strong></span>
              </div>
            </CardContent>
          </Card>

          {/* Session List */}
          <Card>
            <CardHeader>
              <CardTitle>All Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((session) => {
                  const isPast = new Date(session.session_date) <= new Date();
                  return (
                    <div key={session.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                        {isPast ? (
                          session.attended ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : session.attended === false ? (
                            <XCircle className="w-5 h-5 text-destructive" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-muted-foreground" />
                          )
                        ) : (
                          <BookOpen className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{session.topic}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.session_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPast && session.attended !== undefined && (
                          <Badge variant={session.attended ? "default" : "destructive"} className="text-xs">
                            {session.attended ? "Present" : "Absent"}
                          </Badge>
                        )}
                        {!isPast && <Badge variant="outline" className="text-xs">Upcoming</Badge>}
                        {session.recording_link && (
                          <a href={session.recording_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                            <PlayCircle className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentCourses;
