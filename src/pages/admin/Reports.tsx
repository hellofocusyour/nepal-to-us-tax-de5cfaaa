import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Funnel, FunnelChart, LabelList } from "recharts";

const COLORS = ["hsl(197, 83%, 32%)", "hsl(40, 55%, 47%)", "hsl(204, 84%, 15%)", "hsl(197, 75%, 41%)", "#8b5cf6"];

const Reports = () => {
  const [backgroundData, setBackgroundData] = useState<{ name: string; value: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [monthlyEnrollment, setMonthlyEnrollment] = useState<{ month: string; count: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: students } = await supabase.from("students").select("background, status, created_at");

      if (!students) return;

      // Background breakdown
      const bgCounts: Record<string, number> = {};
      students.forEach(s => {
        const bg = s.background || "Unknown";
        bgCounts[bg] = (bgCounts[bg] || 0) + 1;
      });
      setBackgroundData(Object.entries(bgCounts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));

      // Funnel data
      const funnelStages = [
        { name: "Inquired", statuses: ["inquired"] },
        { name: "Contacted", statuses: ["contacted"] },
        { name: "Enrolled", statuses: ["enrolled", "payment_received", "installment_2_due", "fully_paid", "active_student", "completed", "certified"] },
        { name: "Paid", statuses: ["payment_received", "fully_paid", "active_student", "completed", "certified"] },
        { name: "Completed", statuses: ["completed", "certified"] },
      ];
      setStatusData(funnelStages.map(stage => ({
        name: stage.name,
        value: students.filter(s => stage.statuses.includes(s.status)).length,
      })));

      // Monthly enrollment
      const monthly: Record<string, number> = {};
      students.forEach(s => {
        const month = new Date(s.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthly[month] = (monthly[month] || 0) + 1;
      });
      setMonthlyEnrollment(Object.entries(monthly).map(([month, count]) => ({ month, count })).slice(-6));
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Insights into your academy's performance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <Card className="border border-border">
          <CardHeader><CardTitle className="font-display text-lg">Enrollment Trend</CardTitle></CardHeader>
          <CardContent>
            {monthlyEnrollment.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyEnrollment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 20%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(197, 83%, 32%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Background Breakdown */}
        <Card className="border border-border">
          <CardHeader><CardTitle className="font-display text-lg">Student Backgrounds</CardTitle></CardHeader>
          <CardContent>
            {backgroundData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={backgroundData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {backgroundData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="border border-border lg:col-span-2">
          <CardHeader><CardTitle className="font-display text-lg">Conversion Funnel</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 && statusData.some(d => d.value > 0) ? (
              <div className="space-y-3">
                {statusData.map((stage, i) => (
                  <div key={stage.name} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-24 text-muted-foreground">{stage.name}</span>
                    <div className="flex-1 h-10 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center px-3 transition-all"
                        style={{
                          width: `${statusData[0].value ? (stage.value / statusData[0].value) * 100 : 0}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                          minWidth: stage.value > 0 ? "40px" : "0",
                        }}
                      >
                        <span className="text-xs font-bold text-white">{stage.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-12 text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
