import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users, MessageSquare, CreditCard, Clock, GraduationCap, TrendingUp,
  Plus, Megaphone, Eye, ArrowUpRight, ArrowDownRight, Activity,
  Calendar, DollarSign, UserPlus, CheckCircle2, AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface Stats {
  totalInquiries: number;
  totalEnrolled: number;
  paymentsReceived: number;
  pendingPayments: number;
  activeStudents: number;
  completionRate: number;
  revenue: number;
  inquiriesDelta: number;
  studentsDelta: number;
  revenueDelta: number;
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

interface ChartPoint { date: string; inquiries: number; enrollments: number; }

const STATUS_COLORS: Record<string, string> = {
  inquired: "hsl(var(--muted-foreground))",
  contacted: "hsl(var(--primary-light))",
  enrolled: "hsl(var(--primary))",
  active_student: "hsl(var(--secondary))",
  completed: "hsl(142 71% 45%)",
  certified: "hsl(40 80% 55%)",
};

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalInquiries: 0, totalEnrolled: 0, paymentsReceived: 0,
    pendingPayments: 0, activeStudents: 0, completionRate: 0, revenue: 0,
    inquiriesDelta: 0, studentsDelta: 0, revenueDelta: 0,
  });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<{ id: string; full_name: string; email: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since30 = subDays(new Date(), 30).toISOString();
      const since60 = subDays(new Date(), 60).toISOString();

      const [inquiriesRes, studentsRes, paymentsRes, recentInqRes, prevInqRes, prevStuRes] = await Promise.all([
        supabase.from("inquiries").select("id, created_at"),
        supabase.from("students").select("id, status, created_at"),
        supabase.from("payments").select("id, amount, status, created_at"),
        supabase.from("inquiries").select("id, full_name, email, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", since60).lt("created_at", since30),
        supabase.from("students").select("id", { count: "exact", head: true }).gte("created_at", since60).lt("created_at", since30),
      ]);

      const inquiries = inquiriesRes.data || [];
      const studentData = studentsRes.data || [];
      const paymentData = paymentsRes.data || [];

      const enrolled = studentData.filter(s => !["inquired", "contacted"].includes(s.status)).length;
      const active = studentData.filter(s => s.status === "active_student").length;
      const completed = studentData.filter(s => ["completed", "certified"].includes(s.status)).length;
      const verified = paymentData.filter(p => p.status === "verified");
      const pending = paymentData.filter(p => p.status === "pending_verification").length;
      const revenue = verified.reduce((s, p) => s + Number(p.amount || 0), 0);

      // Deltas (last 30d vs prior 30d)
      const recentInq = inquiries.filter(i => new Date(i.created_at) >= new Date(since30)).length;
      const recentStu = studentData.filter(s => new Date(s.created_at) >= new Date(since30)).length;
      const recentRev = verified.filter(p => new Date(p.created_at) >= new Date(since30))
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      const prevRev = verified.filter(p => {
        const d = new Date(p.created_at);
        return d >= new Date(since60) && d < new Date(since30);
      }).reduce((s, p) => s + Number(p.amount || 0), 0);

      const pct = (now: number, prev: number) => prev === 0 ? (now > 0 ? 100 : 0) : Math.round(((now - prev) / prev) * 100);

      setStats({
        totalInquiries: inquiries.length,
        totalEnrolled: enrolled,
        paymentsReceived: verified.length,
        pendingPayments: pending,
        activeStudents: active,
        completionRate: studentData.length > 0 ? Math.round((completed / studentData.length) * 100) : 0,
        revenue,
        inquiriesDelta: pct(recentInq, prevInqRes.count || 0),
        studentsDelta: pct(recentStu, prevStuRes.count || 0),
        revenueDelta: pct(recentRev, prevRev),
      });

      // Build last 14 day series
      const days: ChartPoint[] = [];
      for (let i = 13; i >= 0; i--) {
        const day = startOfDay(subDays(new Date(), i));
        const next = startOfDay(subDays(new Date(), i - 1));
        days.push({
          date: format(day, "MMM d"),
          inquiries: inquiries.filter(x => {
            const d = new Date(x.created_at);
            return d >= day && d < next;
          }).length,
          enrollments: studentData.filter(x => {
            const d = new Date(x.created_at);
            return d >= day && d < next && !["inquired", "contacted"].includes(x.status);
          }).length,
        });
      }
      setChartData(days);

      // Status breakdown
      const statusMap = studentData.reduce<Record<string, number>>((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});
      setStatusBreakdown(
        Object.entries(statusMap).map(([name, value]) => ({
          name: name.replace(/_/g, " "),
          value,
          color: STATUS_COLORS[name] || "hsl(var(--muted))",
        }))
      );

      setRecentInquiries(recentInqRes.data || []);

      const { data: act } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      setActivity(act || []);

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Revenue (verified)",
      value: `Rs. ${stats.revenue.toLocaleString()}`,
      delta: stats.revenueDelta,
      icon: DollarSign,
      gradient: "from-emerald-500/10 to-emerald-500/5",
      iconBg: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: "Total Inquiries",
      value: stats.totalInquiries,
      delta: stats.inquiriesDelta,
      icon: MessageSquare,
      gradient: "from-primary/10 to-primary/5",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      label: "Enrolled Students",
      value: stats.totalEnrolled,
      delta: stats.studentsDelta,
      icon: Users,
      gradient: "from-secondary/15 to-secondary/5",
      iconBg: "bg-secondary/20 text-secondary",
    },
    {
      label: "Active Students",
      value: stats.activeStudents,
      sub: `${stats.completionRate}% completion`,
      icon: GraduationCap,
      gradient: "from-violet-500/10 to-violet-500/5",
      iconBg: "bg-violet-500/15 text-violet-600",
    },
  ];

  const operationalCards = [
    { label: "Payments Verified", value: stats.paymentsReceived, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "Pending Verification", value: stats.pendingPayments, icon: AlertCircle, tone: "text-amber-600" },
    { label: "Completion Rate", value: `${stats.completionRate}%`, icon: TrendingUp, tone: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 lg:p-8 text-primary-foreground">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-primary-light/30 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Admin Console</p>
            <h1 className="text-2xl lg:text-4xl font-display font-bold mt-1">
              Welcome back to Focus Academy
            </h1>
            <p className="opacity-80 mt-2 text-sm lg:text-base">
              {format(new Date(), "EEEE, MMMM d, yyyy")} · Real-time overview of your academy
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm" className="gap-2">
              <Link to="/admin/students"><UserPlus className="w-4 h-4" /> Add Student</Link>
            </Button>
            <Button asChild size="sm" className="gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20">
              <Link to="/admin/announcements"><Megaphone className="w-4 h-4" /> Announce</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className={`relative overflow-hidden border-border bg-gradient-to-br ${kpi.gradient} hover:shadow-md transition-shadow`}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                {typeof kpi.delta === "number" && (
                  <Badge
                    variant="secondary"
                    className={`gap-1 ${kpi.delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {kpi.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.delta)}%
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                {kpi.sub && <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display">Growth Trend</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Inquiries vs enrollments · last 14 days</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Inquiries</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary" /> Enrollments</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradInq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEnr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="inquiries" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradInq)" />
                  <Area type="monotone" dataKey="enrollments" stroke="hsl(var(--secondary))" strokeWidth={2} fill="url(#gradEnr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-display">Student Pipeline</CardTitle>
            <p className="text-xs text-muted-foreground">Lifecycle distribution</p>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">No students yet</p>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {statusBreakdown.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-3">
                  {statusBreakdown.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 capitalize text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      <span className="font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {operationalCards.map((c) => (
          <Card key={c.label} className="border-border">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <c.icon className={`w-5 h-5 ${c.tone}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-xl font-bold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity + Inquiries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Recent Activity
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Latest events across the platform</p>
            </div>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12 text-center">No recent activity yet.</p>
            ) : (
              <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {activity.map((item) => (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.action}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {format(new Date(item.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-display">Latest Inquiries</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">New leads to contact</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/admin/inquiries">All <ArrowUpRight className="w-3 h-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentInquiries.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No inquiries yet.</p>
            ) : (
              recentInquiries.map((inq) => (
                <div key={inq.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {inq.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{inq.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{inq.email}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(inq.created_at), "MMM d")}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
