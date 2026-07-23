import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AdminSection =
  | "dashboard" | "inbox" | "students" | "inquiries" | "payments"
  | "batches" | "live_class" | "modules" | "video_materials"
  | "my_courses" | "announcements" | "reports" | "integrations" | "team";

export const ALL_SECTIONS: { key: AdminSection; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "inbox", label: "Inbox" },
  { key: "students", label: "Students" },
  { key: "inquiries", label: "Inquiries" },
  { key: "payments", label: "Payments" },
  { key: "batches", label: "Batches" },
  { key: "live_class", label: "Live Class" },
  { key: "modules", label: "Modules" },
  { key: "video_materials", label: "Video Materials" },
  { key: "my_courses", label: "My Courses" },
  { key: "announcements", label: "Announcements" },
  { key: "reports", label: "Reports" },
  { key: "integrations", label: "Integrations" },
];

const SUPER_ADMIN_EMAILS = [
  "academy@focusyourfinance.com",
  "hello@focusyourfinance.com",
];

export const useAdminAccess = () => {
  const { user, isAdmin } = useAuth();
  const [sections, setSections] = useState<Set<AdminSection>>(new Set());
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = !!user?.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (isSuperAdmin) {
      setSections(new Set(ALL_SECTIONS.map(s => s.key).concat("team" as AdminSection)));
      setLoading(false);
      return;
    }
    supabase.from("admin_permissions").select("section").eq("user_id", user.id).then(({ data }) => {
      setSections(new Set((data ?? []).map((r: any) => r.section as AdminSection)));
      setLoading(false);
    });
  }, [user, isSuperAdmin]);

  const can = (s: AdminSection) => isSuperAdmin || sections.has(s);
  return { isSuperAdmin, isAdmin, can, sections, loading };
};
