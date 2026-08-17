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
  batchCompleted: boolean;
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
      let batchCompleted = false;
      if (student.batch_id) {
        const { data: batch } = await supabase.from("batches").select("name, is_completed").eq("id", student.batch_id).maybeSingle();
        batchName = batch?.name || null;
        batchCompleted = !!(batch as any)?.is_completed;
      }

      const { data: cert } = await supabase
        .from("certificates")
        .select("issued_on, file_path, is_unlocked")
        .eq("student_id", student.id)
        .maybeSingle();

      setInfo({
        studentStatus: student.status,
        studentName: student.full_name,
        batchName,
        batchCompleted,
        issuedOn: cert?.issued_on ?? null,
        unlocked: !!cert?.is_unlocked,
      });

      if (batchCompleted && cert?.is_unlocked && cert.file_path) {
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

  const unlocked = !!info?.unlocked && !!info?.batchCompleted;
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
                  {info?.issuedOn && (
                    <p>Date issued: <span className="text-foreground">{new Date(info.issuedOn).toLocaleDateString()}</span></p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button asChild variant="outline">
                  <a href={certificateUrl} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button asChild className="bg-[#0A66C2] hover:bg-[#004182] text-white">
                  <a
                    href={(() => {
                      const certName = "US Taxation Course";
                      const org = "Focus Academy";
                      const issue = info?.issuedOn ? new Date(info.issuedOn) : null;
                      const issueYear = issue ? String(issue.getFullYear()) : "";
                      const issueMonth = issue ? String(issue.getMonth() + 1) : "";
                      const params = new URLSearchParams({
                        startTask: "CERTIFICATION_NAME",
                        name: certName,
                        organizationName: org,
                        issueYear,
                        issueMonth,
                        certUrl: certificateUrl || "",
                      });
                      return `https://www.linkedin.com/profile/add?${params.toString()}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    Add to LinkedIn
                  </a>
                </Button>
              </div>
            </div>
          ) : isCompleted ? (
            <div className="text-center py-8 space-y-3">
              <Award className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-foreground font-medium">Course completed!</p>
              <p className="text-sm text-muted-foreground">
                {info?.batchCompleted
                  ? "Your certificate will be issued soon by the admin."
                  : "Certificates are released once your batch is marked complete."}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-foreground font-medium">Certificate Locked</p>
              <p className="text-sm text-muted-foreground">
                {info?.batchCompleted
                  ? "Complete all course requirements to earn your certificate."
                  : "Your certificate unlocks after your batch is marked complete."}
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
