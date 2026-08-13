import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, Lock } from "lucide-react";

interface CertificateInfo {
  studentStatus: string;
  studentName: string;
  batchName: string | null;
  certificateNumber: string | null;
  issuedOn: string | null;
  unlocked: boolean;
}

const StudentCertificates = () => {
  const { user } = useAuth();
  const [info, setInfo] = useState<CertificateInfo | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: students } = await supabase
        .from("students")
        .select("id, full_name, status, batch_id")
        .eq("user_id", user.id);
      const student = students?.[0];

      if (!student) { setLoading(false); return; }

      let batchName: string | null = null;
      if (student.batch_id) {
        const { data: batch } = await supabase.from("batches").select("name").eq("id", student.batch_id).maybeSingle();
        batchName = batch?.name || null;
      }

      const { data: cert } = await supabase
        .from("certificates")
        .select("certificate_number, issued_on, file_path, is_unlocked")
        .eq("student_id", student.id)
        .maybeSingle();

      setInfo({
        studentStatus: student.status,
        studentName: student.full_name,
        batchName,
        certificateNumber: cert?.certificate_number ?? null,
        issuedOn: cert?.issued_on ?? null,
        unlocked: !!cert?.is_unlocked,
      });

      if (cert?.is_unlocked && cert.file_path) {
        const { data: urlData } = await supabase.storage
          .from("certificates")
          .createSignedUrl(cert.file_path, 3600);
        if (urlData) setCertificateUrl(urlData.signedUrl);
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const unlocked = !!info?.unlocked;
  const isCompleted = info?.studentStatus === "completed" || info?.studentStatus === "certified";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Certificates</h1>
        <p className="text-muted-foreground">View and download your certificates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-secondary" />
            Focus Academy — US Taxation Course
          </CardTitle>
          <CardDescription>
            {info?.batchName || "Course Certificate"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unlocked && certificateUrl ? (
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-secondary/10 to-primary/10 border border-secondary/20 text-center space-y-4">
                <Award className="w-16 h-16 mx-auto text-secondary" />
                <div>
                  <h3 className="text-lg font-display font-bold text-foreground">Congratulations, {info?.studentName}!</h3>
                  <p className="text-sm text-muted-foreground">You have successfully completed the course.</p>
                </div>
                <Badge className="bg-secondary text-secondary-foreground">Certified</Badge>
                <div className="text-sm text-muted-foreground space-y-1">
                  {info?.certificateNumber && (
                    <p>Certificate ID: <span className="font-mono text-foreground">{info.certificateNumber}</span></p>
                  )}
                  {info?.issuedOn && (
                    <p>Date issued: <span className="text-foreground">{new Date(info.issuedOn).toLocaleDateString()}</span></p>
                  )}
                </div>
              </div>
              <Button className="w-full" asChild>
                <a href={certificateUrl} download>
                  <Download className="w-4 h-4 mr-2" />
                  Download Certificate
                </a>
              </Button>
            </div>
          ) : isCompleted ? (
            <div className="text-center py-8 space-y-3">
              <Award className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-foreground font-medium">Course completed!</p>
              <p className="text-sm text-muted-foreground">Your certificate will be issued soon by the admin.</p>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-foreground font-medium">Certificate Locked</p>
              <p className="text-sm text-muted-foreground">
                Complete all course requirements to earn your certificate.
              </p>
              <Badge variant="outline">{info?.studentStatus?.replace(/_/g, " ") || "In Progress"}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentCertificates;
