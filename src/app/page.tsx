"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, AlertCircle, ThumbsUp, Layers } from "lucide-react";

interface Stats {
  drafts: number;
  scheduledToday: number;
  postedToday: number;
  failed: number;
  totalPosts: number;
  approved: number;
}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Head to <strong>Studio</strong> to generate content variants with AI.</p>
          <p>2. Review and approve drafts in the <strong>Review</strong> queue.</p>
          <p>3. Schedule posts via <strong>Calendar</strong> or use Auto-build to fill your day.</p>
          <p>4. Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">pnpm worker</code> to publish scheduled posts to Facebook.</p>
          <p>5. Configure Facebook and workflow settings in <strong>Settings</strong>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
