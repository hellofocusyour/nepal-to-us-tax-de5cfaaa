import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Upload, Trash2, Download, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StudentRow {
  id: string;
  full_name: string;
  email: string;
  status: string;
  batch_id: string | null;
}

interface CertRow {
  id: string;
  student_id: string;
  batch_id: string | null;
  certificate_number: string;
  issued_on: string | null;
  file_path: string | null;
  is_unlocked: boolean;
}

const AdminCertificates = () => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; end_date: string }[]>([]);
  const [certs, setCerts] = useState<Record<string, CertRow>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data: st }, { data: b }, { data: c }] = await Promise.all([
      supabase.from("students").select("id, full_name, email, status, batch_id").order("full_name"),
      supabase.from("batches").select("id, name, end_date").order("start_date", { ascending: false }),
      supabase.from("certificates").select("*"),
    ]);
    setStudents((st ?? []) as StudentRow[]);
    setBatches((b ?? []) as any);
    const map: Record<string, CertRow> = {};
    (c ?? []).forEach((row: any) => { map[row.student_id] = row as CertRow; });
    setCerts(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      if (batchFilter !== "all" && s.batch_id !== batchFilter) return false;
      if (!q) return true;
      return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
  }, [students, search, batchFilter]);

  const ensureCert = async (student: StudentRow): Promise<CertRow | null> => {
    const existing = certs[student.id];
    if (existing) return existing;
    const { data, error } = await supabase
      .from("certificates")
      .insert({ student_id: student.id, certificate_number: "" } as any)
      .select()
      .single();
    if (error) { toast.error(error.message); return null; }
    setCerts(prev => ({ ...prev, [student.id]: data as CertRow }));
    return data as CertRow;
  };

  const updateCert = async (cert: CertRow, patch: Partial<CertRow>) => {
    const { data, error } = await supabase
      .from("certificates")
      .update(patch as any)
      .eq("id", cert.id)
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setCerts(prev => ({ ...prev, [cert.student_id]: data as CertRow }));
  };

  const handleUpload = async (student: StudentRow, file: File) => {
    setBusy(student.id);
    try {
      const cert = await ensureCert(student);
      if (!cert) return;
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${student.id}/${cert.certificate_number}.${ext}`;
      const { error } = await supabase.storage.from("certificates").upload(path, file, { upsert: true });
      if (error) { toast.error(error.message); return; }
      await updateCert(cert, { file_path: path });
      toast.success("Certificate uploaded");
    } finally {
      setBusy(null);
    }
  };

  const handleToggle = async (student: StudentRow, unlocked: boolean) => {
    setBusy(student.id);
    try {
      const cert = await ensureCert(student);
      if (!cert) return;
      if (unlocked && !cert.file_path) {
        toast.error("Upload the certificate file first");
        return;
      }
      await updateCert(cert, { is_unlocked: unlocked });
      toast.success(unlocked ? "Certificate unlocked for student" : "Certificate locked");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (cert: CertRow) => {
    if (!cert.file_path) return;
    const { data } = await supabase.storage.from("certificates").createSignedUrl(cert.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (cert: CertRow) => {
    if (!confirm("Remove this certificate record and file?")) return;
    if (cert.file_path) await supabase.storage.from("certificates").remove([cert.file_path]);
    const { error } = await supabase.from("certificates").delete().eq("id", cert.id);
    if (error) { toast.error(error.message); return; }
    setCerts(prev => {
      const next = { ...prev };
      delete next[cert.student_id];
      return next;
    });
    toast.success("Certificate removed");
  };

  const issuedCount = Object.values(certs).length;
  const unlockedCount = Object.values(certs).filter(c => c.is_unlocked).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Award className="w-6 h-6 text-secondary" /> Certificates
          </h1>
          <p className="text-muted-foreground">
            Upload each student's certificate, then unlock it to make it visible in their portal.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{issuedCount} issued</Badge>
          <Badge variant="secondary">{unlockedCount} unlocked</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search student name or email" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All batches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map(student => {
          const cert = certs[student.id];
          const batch = batches.find(b => b.id === student.batch_id);
          return (
            <Card key={student.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{student.full_name}</CardTitle>
                    <CardDescription>{student.email} · {batch?.name || "No batch"}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {cert && (
                      <Badge variant={cert.is_unlocked ? "default" : "outline"}>
                        {cert.is_unlocked ? "Unlocked" : "Locked"}
                      </Badge>
                    )}
                    {busy === student.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cert && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Label htmlFor={`d-${cert.id}`} className="text-muted-foreground">Date issued</Label>
                      <Input
                        id={`d-${cert.id}`}
                        type="date"
                        className="h-8 w-[170px]"
                        value={cert.issued_on ?? ""}
                        onChange={e => updateCert(cert, { issued_on: e.target.value })}
                      />
                    </div>
                  </div>
                )}
                {!batch?.is_completed && (
                  <p className="text-xs text-muted-foreground">
                    Certificates stay hidden until this student's batch is marked Complete in Batches.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {cert?.file_path ? "Replace file" : "Upload certificate"}
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(student, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </Button>

                  {cert?.file_path && (
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(cert)}>
                      <Download className="w-4 h-4 mr-2" /> Preview
                    </Button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <Label className="text-sm text-muted-foreground">Visible to student</Label>
                    <Switch
                      checked={!!cert?.is_unlocked}
                      onCheckedChange={v => handleToggle(student, v)}
                    />
                    {cert && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cert)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No students match your filters.</p>
        )}
      </div>
    </div>
  );
};

export default AdminCertificates;
