import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, ExternalLink, Download } from "lucide-react";
import { format } from "date-fns";
import PaidAccessGate from "@/components/student/PaidAccessGate";

type TabKey = "syllabus" | "my_courses";

interface Doc {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size: number;
  tab: TabKey;
  uploaded_at: string;
}

const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

const StudentMyCourses = () => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("syllabus");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("course_documents").select("*").order("uploaded_at", { ascending: false });
      setDocs((data as Doc[]) || []);
    })();
  }, []);

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

  const tabDocs = docs.filter(d => d.tab === activeTab);

  return (
    <PaidAccessGate>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Courses</h1>
          <p className="text-sm text-muted-foreground">Your syllabus and course materials</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
            <TabsTrigger value="my_courses">My Courses</TabsTrigger>
          </TabsList>

          {(["syllabus", "my_courses"] as TabKey[]).map(t => (
            <TabsContent key={t} value={t} className="mt-4">
              {tabDocs.length === 0 ? (
                <Card><CardContent className="py-16 text-center">
                  <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No documents available yet.</p>
                </CardContent></Card>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {tabDocs.map(d => (
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
          ))}
        </Tabs>
      </div>
    </PaidAccessGate>
  );
};

export default StudentMyCourses;
