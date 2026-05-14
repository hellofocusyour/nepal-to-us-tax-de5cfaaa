import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, ExternalLink, Download, Lock, CheckCircle2, PlayCircle, Layers } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import PaymentModal from "@/components/student/PaymentModal";
import ModuleViewer from "@/components/student/ModuleViewer";

type TabKey = "modules" | "documents";

interface Doc {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size: number;
  tab: string;
  uploaded_at: string;
}

interface Module {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  slide_count: number;
  is_unlocked: boolean;
  completed_at: string | null;
}

const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const StudentMyCourses = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("modules");
  const [hasAccess, setHasAccess] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [openModule, setOpenModule] = useState<number | null>(null);

  useEffect(() => {
    const loadDocs = async () => {
      const { data } = await supabase.from("course_documents").select("*").order("uploaded_at", { ascending: false });
      setDocs((data as Doc[]) || []);
    };
    const loadModules = async () => {
      const { data } = await supabase.from("course_modules").select("*").order("module_number");
      setModules((data as Module[]) || []);
    };
    loadDocs(); loadModules();
    const ch = supabase.channel("course-modules-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "course_modules" }, loadModules)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const checkAccess = async (uid: string) => {
    const { data: student } = await supabase.from("students").select("id").eq("user_id", uid).maybeSingle();
    if (!student) return null;
    setStudentId(student.id);
    const { data: pays } = await supabase.from("payments")
      .select("installment_number, status").eq("student_id", student.id).eq("status", "verified");
    setHasAccess((pays || []).some(p => p.installment_number === 1));
    return student.id;
  };

  useEffect(() => {
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const sid = await checkAccess(user.id);
      if (sid) {
        channel = supabase.channel(`mycourses-gate-${sid}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter: `student_id=eq.${sid}` },
            () => checkAccess(user.id))
          .subscribe();
      }
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user]);

  const handleDownload = async (d: Doc) => {
    try {
      const res = await fetch(d.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = d.file_name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(d.file_url, "_blank");
    }
  };

  const myCoursesDocs = docs.filter(d => d.tab === "my_courses");
  const locked = !hasAccess;

  const LockedCard = (
    <Card><CardContent className="py-16 text-center space-y-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Lock className="w-7 h-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-display font-bold text-foreground">Complete first payment to unlock</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Course modules and materials unlock as soon as your first payment is verified.
      </p>
      <Button onClick={() => setPayOpen(true)}>Make a payment</Button>
    </CardContent></Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">My Courses</h1>
        <p className="text-sm text-muted-foreground">Modules, syllabus and course materials</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="modules"><Layers className="w-4 h-4 mr-1" /> Modules</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-1" /> Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4">
          {locked ? LockedCard : (
            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((m) => {
                const mLocked = !m.is_unlocked;
                return (
                  <Card key={m.id} className={mLocked ? "opacity-70" : ""}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Module {m.module_number}</div>
                          <div className="font-display font-bold text-lg text-foreground">{m.title}</div>
                        </div>
                        {m.completed_at ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Done</Badge>
                        ) : mLocked ? (
                          <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                        ) : (
                          <Badge variant="secondary">Available</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{m.slide_count} slides</span>
                        <Button size="sm" disabled={mLocked} onClick={() => setOpenModule(m.module_number)}>
                          {mLocked ? <><Lock className="w-4 h-4 mr-2" />Locked</> : <><PlayCircle className="w-4 h-4 mr-2" />View slides</>}
                        </Button>
                      </div>
                      {mLocked && m.module_number > 1 && (
                        <p className="text-xs text-muted-foreground italic">Unlocks after Module {m.module_number - 1} class is completed.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {locked ? LockedCard : myCoursesDocs.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No documents available yet.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {myCoursesDocs.map(d => (
                <Card key={d.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground">{d.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-3 mt-1">{d.description}</p>
                      </div>
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.file_name} · {formatSize(d.file_size)} · {format(new Date(d.uploaded_at), "MMM d, yyyy")}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => window.open(d.file_url, "_blank")}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> View PDF
                      </Button>
                      <Button size="sm" onClick={() => handleDownload(d)}>
                        <Download className="w-3.5 h-3.5 mr-1" /> Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {openModule !== null && (
        <ModuleViewer moduleNumber={openModule} onClose={() => setOpenModule(null)} />
      )}

      <PaymentModal open={payOpen} onOpenChange={setPayOpen} studentId={studentId} />
    </div>
  );
};

export default StudentMyCourses;
