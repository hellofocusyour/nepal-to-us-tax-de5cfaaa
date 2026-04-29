import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Lock, PlayCircle, Clock, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import PaidAccessGate from "@/components/student/PaidAccessGate";

interface Lesson { title: string; duration: string; status: "done" | "current" | "upcoming"; }
interface Module { title: string; lessons: Lesson[]; state: "completed" | "in_progress" | "locked"; unlock?: string; }

const modules: Module[] = [
  {
    title: "Module 1 — US Tax System Fundamentals",
    state: "completed",
    lessons: [
      { title: "Intro to US Federal Tax", duration: "45 min", status: "done" },
      { title: "Filing Status & Dependents", duration: "55 min", status: "done" },
      { title: "Forms 1040 / W-2 / 1099", duration: "60 min", status: "done" },
    ],
  },
  {
    title: "Module 2 — Individual Tax Returns (Form 1040)",
    state: "in_progress",
    lessons: [
      { title: "Income types & inclusions", duration: "50 min", status: "done" },
      { title: "Deductions & credits", duration: "65 min", status: "current" },
      { title: "Tax calculation walkthrough", duration: "70 min", status: "upcoming" },
    ],
  },
  {
    title: "Module 3 — Schedules A, B, C, D",
    state: "locked",
    unlock: "Unlocks after Module 2",
    lessons: [
      { title: "Schedule A — Itemized Deductions", duration: "55 min", status: "upcoming" },
      { title: "Schedule C — Business Income", duration: "60 min", status: "upcoming" },
    ],
  },
  {
    title: "Module 4 — IRS e-File & Compliance",
    state: "locked",
    unlock: "Unlocks on Dec 1",
    lessons: [
      { title: "E-filing process end to end", duration: "45 min", status: "upcoming" },
      { title: "Common rejections & fixes", duration: "40 min", status: "upcoming" },
    ],
  },
];

const StudentSyllabus = () => {
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const doneLessons = modules.reduce((s, m) => s + m.lessons.filter(l => l.status === "done").length, 0);
  const pct = Math.round((doneLessons / totalLessons) * 100);

  return (
    <PaidAccessGate>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">US Taxation Course</h1>
          <p className="text-sm text-muted-foreground">{modules.length} modules · {totalLessons} lessons · ~30 hrs</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Overall progress</p>
            <span className="text-sm font-semibold text-primary">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span>{doneLessons} of {totalLessons} lessons complete</span>
            <span>Est. finish: in 4 weeks</span>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={modules.filter(m => m.state === "in_progress").map((_, i) => `m-${i}`)} className="space-y-3">
        {modules.map((m, idx) => (
          <AccordionItem
            key={idx}
            value={`m-${idx}`}
            className={cn(
              "rounded-lg border bg-card overflow-hidden",
              m.state === "in_progress" && "border-primary",
              m.state === "locked" && "opacity-60"
            )}
          >
            <AccordionTrigger className="px-4 py-4 hover:no-underline">
              <div className="flex items-center gap-3 flex-1 text-left">
                {m.state === "completed" && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                {m.state === "in_progress" && <PlayCircle className="w-5 h-5 text-primary shrink-0" />}
                {m.state === "locked" && <Lock className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base text-foreground">{m.title}</p>
                  {m.unlock && <p className="text-xs text-muted-foreground mt-0.5">{m.unlock}</p>}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 hidden sm:inline-flex",
                    m.state === "completed" && "bg-primary/10 text-primary border-primary/30",
                    m.state === "in_progress" && "bg-primary text-primary-foreground border-primary",
                    m.state === "locked" && "bg-muted"
                  )}
                >
                  {m.state === "completed" ? "Completed" : m.state === "in_progress" ? "In progress" : "Locked"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-3">
              <div className="space-y-1.5">
                {m.lessons.map((l, li) => (
                  <div key={li} className={cn(
                    "flex items-center gap-3 p-2 rounded-md",
                    l.status === "current" && "bg-primary/5"
                  )}>
                    {l.status === "done" && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    {l.status === "current" && <PlayCircle className="w-4 h-4 text-primary shrink-0" />}
                    {l.status === "upcoming" && <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />}
                    <p className="text-sm flex-1 text-foreground">{l.title}</p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {l.duration}
                    </span>
                    {l.status === "current" && (
                      <Button size="sm" className="h-7">Resume</Button>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {modules.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Syllabus will appear here once admin uploads it.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentSyllabus;
