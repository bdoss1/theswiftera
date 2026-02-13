"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertCircle, ThumbsUp, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Stats {
  drafts: number;
  scheduledToday: number;
  postedToday: number;
  failed: number;
  totalPosts: number;
  approved: number;
  dailyData: Array<{ date: string; posted: number; created: number }>;
  pillarData: Array<{ pillar: string; count: number }>;
}

const PILLAR_COLORS: Record<string, string> = {
  BROTHERHOOD: "#6366f1",
  LEADERSHIP: "#f59e0b",
  HUMOR: "#22c55e",
  ENTREPRENEURSHIP: "#3b82f6",
  FAMILY: "#ec4899",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then((d) => setStats(d));
  }, []);

  const cards = [
    { label: "Drafts", value: stats?.drafts ?? 0, icon: FileText, color: "text-blue-600" },
    { label: "Approved", value: stats?.approved ?? 0, icon: ThumbsUp, color: "text-emerald-600" },
    { label: "Scheduled Today", value: stats?.scheduledToday ?? 0, icon: Clock, color: "text-amber-600" },
    { label: "Posted Today", value: stats?.postedToday ?? 0, icon: CheckCircle, color: "text-green-600" },
    { label: "Failed", value: stats?.failed ?? 0, icon: AlertCircle, color: "text-red-600" },
    { label: "Total Content", value: stats?.totalPosts ?? 0, icon: Layers, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">The Swift Era is upon us. Better adjust accordingly.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats ? card.value : "—"}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Content Activity (14 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.dailyData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.dailyData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(v) => `Date: ${v}`} />
                  <Bar dataKey="created" fill="hsl(var(--muted-foreground))" name="Created" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="posted" fill="hsl(var(--primary))" name="Posted" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Loading chart...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content by Pillar</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.pillarData && stats.pillarData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stats.pillarData}
                      dataKey="count"
                      nameKey="pillar"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      strokeWidth={2}
                    >
                      {stats.pillarData.map((entry) => (
                        <Cell key={entry.pillar} fill={PILLAR_COLORS[entry.pillar] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stats.pillarData.map((p) => (
                    <div key={p.pillar} className="flex items-center gap-1 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: PILLAR_COLORS[p.pillar] || "#94a3b8" }} />
                      {p.pillar} ({p.count})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Head to <strong>Studio</strong> to generate content variants with AI.</p>
          <p>2. Review and approve drafts in the <strong>Review</strong> queue.</p>
          <p>3. Schedule posts via <strong>Calendar</strong> or use Auto-build to fill your day.</p>
          <p>4. Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">pnpm worker</code> to publish scheduled posts to Facebook.</p>
          <p>5. View published post history in <strong>History</strong>.</p>
          <p>6. Configure Facebook, workflow settings, and prompt templates in <strong>Settings</strong>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
