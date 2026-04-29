import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PaymentModal from "@/components/student/PaymentModal";

interface Props { children: React.ReactNode; }

const PaidAccessGate = ({ children }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: student } = await supabase.from("students")
        .select("id").eq("user_id", user.id).maybeSingle();
      if (!student) { setLoading(false); return; }
      setStudentId(student.id);
      const { data: pays } = await supabase.from("payments")
        .select("installment_number, status")
        .eq("student_id", student.id).eq("status", "verified");
      setHasAccess((pays || []).some(p => p.installment_number === 1));
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (hasAccess) return <>{children}</>;

  return (
    <>
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground">Complete first payment to unlock</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your course content unlocks as soon as your first payment is verified.
          </p>
          <Button onClick={() => setOpen(true)}>Make a payment</Button>
        </CardContent>
      </Card>
      <PaymentModal open={open} onOpenChange={setOpen} studentId={studentId} />
    </>
  );
};

export default PaidAccessGate;
