import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import BatchMultiSelect from "@/components/admin/BatchMultiSelect";

interface Module {
  id: string;
  module_number: number;
  title: string;
  description: string | null;
  slide_count: number;
  is_unlocked: boolean;
  completed_at: string | null;
}

const AdminModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleBatches, setModuleBatches] = useState<Record<string, string[]>>({});

  const load = async () => {
    const { data } = await supabase.from("course_modules").select("*").order("module_number");
    setModules((data as Module[]) || []);
    const { data: links } = await (supabase as any).from("module_batches").select("module_id, batch_id");
    const map: Record<string, string[]> = {};
    (links || []).forEach((l: any) => { (map[l.module_id] ||= []).push(l.batch_id); });
    setModuleBatches(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleUnlock = async (m: Module, value: boolean) => {
    const { error } = await supabase.from("course_modules").update({ is_unlocked: value }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(`Module ${m.module_number} ${value ? "unlocked" : "locked"}`);
    load();
  };

  const markCompleteAndUnlockNext = async (m: Module) => {
    const next = modules.find(x => x.module_number === m.module_number + 1);
    const updates: any = { completed_at: new Date().toISOString() };
    const { error } = await supabase.from("course_modules").update(updates).eq("id", m.id);
    if (error) return toast.error(error.message);
    if (next) {
      const { error: e2 } = await supabase.from("course_modules")
        .update({ is_unlocked: true }).eq("id", next.id);
      if (e2) return toast.error(e2.message);
      toast.success(`Module ${m.module_number} marked complete. Module ${next.module_number} unlocked.`);
    } else {
      toast.success(`Module ${m.module_number} marked complete.`);
    }
    load();
  };

  const reopen = async (m: Module) => {
    const { error } = await supabase.from("course_modules").update({ completed_at: null }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Marked as not completed");
    load();
  };

  const saveBatches = async (moduleId: string, batchIds: string[]) => {
    setModuleBatches(prev => ({ ...prev, [moduleId]: batchIds }));
    await (supabase as any).from("module_batches").delete().eq("module_id", moduleId);
    if (batchIds.length) {
      const { error } = await (supabase as any).from("module_batches")
        .insert(batchIds.map(bid => ({ module_id: moduleId, batch_id: bid })));
      if (error) return toast.error(error.message);
    }
    toast.success("Batch visibility updated");
  };


  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Course Modules</h1>
        <p className="text-muted-foreground">Mark a module complete to unlock the next one for paid students.</p>
      </div>
      <div className="grid gap-4">
        {modules.map((m) => (
          <Card key={m.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <span>Module {m.module_number}: {m.title}</span>
                  {m.completed_at && <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>}
                  {m.is_unlocked ? <Badge variant="secondary"><Unlock className="w-3 h-3 mr-1" />Unlocked</Badge> : <Badge variant="outline"><Lock className="w-3 h-3 mr-1" />Locked</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.slide_count} slides</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Unlocked</span>
                <Switch checked={m.is_unlocked} onCheckedChange={(v) => toggleUnlock(m, v)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {!m.completed_at ? (
                  <Button onClick={() => markCompleteAndUnlockNext(m)}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />Mark class complete & unlock next
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => reopen(m)}>Re-open module</Button>
                )}
              </div>
              <BatchMultiSelect
                value={moduleBatches[m.id] || []}
                onChange={(ids) => saveBatches(m.id, ids)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminModules;
