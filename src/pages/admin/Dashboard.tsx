import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, MessageSquare, CreditCard, Clock, GraduationCap, TrendingUp,
  Plus, Megaphone, Eye
} from "lucide-react";
import { Link } from "react-router-dom";

interface Stats {
  totalInquiries: number;
  totalEnrolled: number;
  paymentsReceived: number;
  pendingPayments: number;
  activeStudents: number;
  completionRate: number;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalInquiries: 0, totalEnrolled: 0, paymentsReceived: 0,
    pendingPayments: 0, activeStudents: 0, completionRate: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [inquiries, students, payments] = await Promise.all([
        supabase.from("inquiries").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id, status"),
        supabase.from("payments").select("id, status"),
      ]);

      const studentData = students.data || [];
      const paymentData = payments.data || [];
      const enrolled = studentData.filter(s => s.status !== "inquired" && s.status !== "contacted").length;
      const active = studentData.filter(s => s.status === "active_student").length;
      const completed = studentData.filter(s => s.status === "completed" || s.status === "certified").length;
      const verified = paymentData.filter(p => p.status === "verified").length;
      const pending = paymentData.filter(p => p.status === "pending_verification").length;

      setStats({
        totalInquiries: inquiries.count || 0,
        totalEnrolled: enrolled,
        paymentsReceived: verified,
        pendingPayments: pending,
        activeStudents: active,
        completionRate: studentData.length > 0 ? Math.round((completed / studentData.length) * 100) : 0,
      });
    };

    const fetchActivity = async () => {
      const { data } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setActivity(data || []);
    };

    fetchStats();
    fetchActivity();
  }, []);

  const statCards = [
    { label: "Total Inquiries", value: stats.totalInquiries, icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
    { label: "Total Enrolled", value: stats.totalEnrolled, icon: Users, color: "text-green-600 bg-green-50" },
    { label: "Payments Received", value: stats.paymentsReceived, icon: CreditCard, color: "text-emerald-600 bg-emerald-50" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Active Students", value: stats.activeStudents, icon: GraduationCap, color: "text-primary bg-accent" },
    { label: "Completion Rate", value: `${stats.completionRate}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to Focus Academy Admin</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/students">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Plus className="w-4 h-4" /> Add Student
              </Button>
            </Link>
            <Link to="/admin/announcements">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Megaphone className="w-4 h-4" /> Send Announcement
              </Button>
            </Link>
            <Link to="/admin/payments">
              <Button className="w-full justify-start gap-2" variant="outline">
                <Eye className="w-4 h-4" /> View Payments
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No recent activity yet.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
