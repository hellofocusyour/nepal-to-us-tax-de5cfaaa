import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import PaidAccessGate from "@/components/student/PaidAccessGate";
import ModuleViewer from "@/components/student/ModuleViewer";

interface Module {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  slide_count: number;
  is_unlocked: boolean;
  completed_at: string | null;
}

const StudentModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModule, setOpenModule] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("course_modules").select("*").order("module_number");
      setModules((data as Module[]) || []);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("course-modules-stream")
      .on("postgres_changes", { event: "*", schema: "public", table: "course_modules" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <PaidAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Course Modules</h1>
          <p className="text-muted-foreground">Modules unlock as your instructor completes each class.</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((m) => {
              const locked = !m.is_unlocked;
              return (
                <Card key={m.id} className={locked ? "opacity-70" : ""}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Module {m.module_number}</div>
                        <div className="font-display font-bold text-lg text-foreground">{m.title}</div>
                      </div>
                      {m.completed_at ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Done</Badge>
                      ) : locked ? (
                        <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                      ) : (
                        <Badge variant="secondary">Available</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{m.slide_count} slides</span>
                      <Button size="sm" disabled={locked} onClick={() => setOpenModule(m.module_number)}>
                        {locked ? <><Lock className="w-4 h-4 mr-2" />Locked</> : <><PlayCircle className="w-4 h-4 mr-2" />View slides</>}
                      </Button>
                    </div>
                    {locked && m.module_number > 1 && (
                      <p className="text-xs text-muted-foreground italic">Unlocks after Module {m.module_number - 1} class is completed.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {openModule !== null && (
          <ModuleViewer moduleNumber={openModule} onClose={() => setOpenModule(null)} />
        )}
      </div>
    </PaidAccessGate>
  );
};

export default StudentModules;
