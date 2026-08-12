import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ListChecks, BarChart3, Pencil, FileQuestion } from "lucide-react";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  batch_id: string | null;
  duration_minutes: number;
  pass_percentage: number;
  is_published: boolean;
  created_at: string;
}

interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  marks: number;
  display_order: number;
}

const emptyExam = {
  title: "",
  description: "",
  batches: [] as string[],
  duration_minutes: 30,
  pass_percentage: 50,
  is_published: false,
};

const Exams = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [examBatches, setExamBatches] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [examDialog, setExamDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyExam);

  const [qExam, setQExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [resultsExam, setResultsExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: ex }, { data: b }, { data: eb }] = await Promise.all([
      supabase.from("exams").select("*").order("created_at", { ascending: false }),
      supabase.from("batches").select("id, name").order("start_date", { ascending: false }),
      supabase.from("exam_batches").select("exam_id, batch_id"),
    ]);
    const map: Record<string, string[]> = {};
    ((eb as any) ?? []).forEach((r: any) => {
      map[r.exam_id] = [...(map[r.exam_id] ?? []), r.batch_id];
    });
    setExams((ex as any) ?? []);
    setBatches((b as any) ?? []);
    setExamBatches(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditingId(null); setForm(emptyExam); setExamDialog(true); };
  const openEdit = (e: Exam) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      description: e.description ?? "",
      batches: examBatches[e.id] ?? [],
      duration_minutes: e.duration_minutes,
      pass_percentage: e.pass_percentage,
      is_published: e.is_published,
    });
    setExamDialog(true);
  };

  const syncBatches = async (examId: string, selected: string[]) => {
    await supabase.from("exam_batches").delete().eq("exam_id", examId);
    if (selected.length) {
      await supabase.from("exam_batches")
        .insert(selected.map((batch_id) => ({ exam_id: examId, batch_id })));
    }
  };

  const saveExam = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      batch_id: null,
      duration_minutes: Number(form.duration_minutes) || 30,
      pass_percentage: Number(form.pass_percentage) || 50,
      is_published: form.is_published,
    };
    let examId = editingId;
    if (editingId) {
      const { error } = await supabase.from("exams").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("exams")
        .insert({ ...payload, created_by: user?.id }).select("id").single();
      if (error) return toast.error(error.message);
      examId = (data as any).id;
    }
    if (examId) await syncBatches(examId, form.batches);
    toast.success(editingId ? "Exam updated" : "Exam created");
    setExamDialog(false);
    load();
  };

  const toggleBatchUnlock = async (exam: Exam, batchId: string, unlocked: boolean) => {
    if (unlocked) {
      const { error } = await supabase.from("exam_batches")
        .delete().eq("exam_id", exam.id).eq("batch_id", batchId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("exam_batches")
        .insert({ exam_id: exam.id, batch_id: batchId });
      if (error) return toast.error(error.message);
    }
    load();
  };


  const togglePublish = async (e: Exam) => {
    const { error } = await supabase.from("exams").update({ is_published: !e.is_published }).eq("id", e.id);
    if (error) return toast.error(error.message);
    load();
  };

  const deleteExam = async (e: Exam) => {
    if (!confirm(`Delete "${e.title}" and all its questions and results?`)) return;
    const { error } = await supabase.from("exams").delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Exam deleted");
    load();
  };

  const openQuestions = async (e: Exam) => {
    setQExam(e);
    const { data } = await supabase.from("exam_questions").select("*")
      .eq("exam_id", e.id).order("display_order", { ascending: true });
    setQuestions(((data as any) ?? []).map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    })));
  };

  const addQuestion = async () => {
    if (!qExam) return;
    const { error } = await supabase.from("exam_questions").insert({
      exam_id: qExam.id,
      question_text: "New question",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_index: 0,
      marks: 1,
      display_order: questions.length,
    });
    if (error) return toast.error(error.message);
    openQuestions(qExam);
  };

  const updateQuestion = async (q: Question, patch: Partial<Question>) => {
    setQuestions(prev => prev.map(x => (x.id === q.id ? { ...x, ...patch } as Question : x)));
    const { error } = await supabase.from("exam_questions").update(patch as any).eq("id", q.id);
    if (error) toast.error(error.message);
  };

  const deleteQuestion = async (q: Question) => {
    const { error } = await supabase.from("exam_questions").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    setQuestions(prev => prev.filter(x => x.id !== q.id));
  };

  const openResults = async (e: Exam) => {
    setResultsExam(e);
    const { data: attempts } = await supabase.from("exam_attempts").select("*")
      .eq("exam_id", e.id).order("submitted_at", { ascending: false });
    const ids = [...new Set(((attempts as any) ?? []).map((a: any) => a.user_id))];
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids as string[])
      : { data: [] as any };
    const byUser: Record<string, any> = {};
    ((profiles as any) ?? []).forEach((p: any) => { byUser[p.user_id] = p; });
    setResults(((attempts as any) ?? []).map((a: any) => ({ ...a, profile: byUser[a.user_id] })));
  };

  const unlockedLabel = (examId: string) => {
    const ids = examBatches[examId] ?? [];
    if (ids.length === 0) return "All batches";
    return ids.map(id => batches.find(b => b.id === id)?.name ?? "Unknown batch").join(", ");
  };


  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-primary" /> Exams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create online exams, add multiple-choice questions and review student results.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New exam</Button>
      </div>

      {loading ? (
        <div>Loading exams…</div>
      ) : exams.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No exams yet. Create your first exam to get started.
        </Card>
      ) : (
        <div className="space-y-4">
          {exams.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{e.title}</p>
                    <Badge variant={e.is_published ? "default" : "secondary"}>
                      {e.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    Unlocked for: {unlockedLabel(e.id)} · {e.duration_minutes} min · pass {e.pass_percentage}%
                  </p>
                  {batches.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {batches.map((b) => {
                        const unlocked = (examBatches[e.id] ?? []).includes(b.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => toggleBatchUnlock(e, b.id, unlocked)}
                            className={
                              "text-xs px-2 py-1 rounded-full border transition-colors " +
                              (unlocked
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:bg-accent")
                            }
                          >
                            {unlocked ? "🔓 " : "🔒 "}{b.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 mr-2">
                    <Switch checked={e.is_published} onCheckedChange={() => togglePublish(e)} />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openQuestions(e)}>
                    <ListChecks className="w-4 h-4 mr-1" /> Questions
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openResults(e)}>
                    <BarChart3 className="w-4 h-4 mr-1" /> Results
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteExam(e)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Exam form */}
      <Dialog open={examDialog} onOpenChange={setExamDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit exam" : "New exam"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} />
            </div>
            <div>
              <Label>Instructions (optional)</Label>
              <Textarea value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} />
            </div>
            <div>
              <Label>Unlock for batches</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select none to make it available to every batch.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {batches.map((b) => {
                  const checked = (form.batches as string[]).includes(b.id);
                  return (
                    <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-accent">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => setForm({
                          ...form,
                          batches: checked
                            ? (form.batches as string[]).filter((id) => id !== b.id)
                            : [...(form.batches as string[]), b.id],
                        })}
                      />
                      {b.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" value={form.duration_minutes}
                  onChange={(ev) => setForm({ ...form, duration_minutes: ev.target.value })} />
              </div>
              <div>
                <Label>Pass percentage</Label>
                <Input type="number" value={form.pass_percentage}
                  onChange={(ev) => setForm({ ...form, pass_percentage: ev.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <span className="text-sm">Publish to students</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamDialog(false)}>Cancel</Button>
            <Button onClick={saveExam}>{editingId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questions */}
      <Dialog open={!!qExam} onOpenChange={(o) => !o && setQExam(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Questions — {qExam?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            )}
            {questions.map((q, idx) => (
              <Card key={q.id} className="p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-semibold mt-2">{idx + 1}.</span>
                  <Textarea
                    value={q.question_text}
                    onChange={(ev) => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, question_text: ev.target.value } : x))}
                    onBlur={(ev) => updateQuestion(q, { question_text: ev.target.value })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2 pl-6">
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={q.correct_index === i}
                        onChange={() => updateQuestion(q, { correct_index: i })}
                        aria-label={`Mark option ${i + 1} correct`}
                      />
                      <Input
                        value={opt}
                        onChange={(ev) => setQuestions(prev => prev.map(x => x.id === q.id
                          ? { ...x, options: x.options.map((o, j) => (j === i ? ev.target.value : o)) } : x))}
                        onBlur={(ev) => updateQuestion(q, {
                          options: q.options.map((o, j) => (j === i ? ev.target.value : o)),
                        })}
                      />
                      {q.options.length > 2 && (
                        <Button variant="ghost" size="sm"
                          onClick={() => updateQuestion(q, { options: q.options.filter((_, j) => j !== i) })}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm"
                      onClick={() => updateQuestion(q, { options: [...q.options, `Option ${q.options.length + 1}`] })}>
                      <Plus className="w-3 h-3 mr-1" /> Option
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Marks</Label>
                      <Input type="number" className="w-20" value={q.marks}
                        onChange={(ev) => setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, marks: Number(ev.target.value) } : x))}
                        onBlur={(ev) => updateQuestion(q, { marks: Number(ev.target.value) || 1 })} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <Button onClick={addQuestion}><Plus className="w-4 h-4 mr-2" /> Add question</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results */}
      <Dialog open={!!resultsExam} onOpenChange={(o) => !o && setResultsExam(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Results — {resultsExam?.title}</DialogTitle></DialogHeader>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium">{r.profile?.full_name || r.profile?.email || "Student"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.profile?.email} · {new Date(r.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.score}/{r.total_marks}</span>
                    <Badge variant={r.passed ? "default" : "destructive"}>{r.passed ? "Passed" : "Failed"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exams;
