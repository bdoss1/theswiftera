"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  TrendingUp,
  Target,
  Zap,
  AlertTriangle,
  Star,
  Lightbulb,
  CheckSquare,
  Clock,
} from "lucide-react";
import type { StrategyReport } from "@/lib/ai/strategy";

const PILLAR_COLORS: Record<string, string> = {
  BROTHERHOOD: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  LEADERSHIP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  HUMOR: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  ENTREPRENEURSHIP: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  FAMILY: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
};

const TONE_COLORS: Record<string, string> = {
  LEADER: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  FUNNY: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  REFLECTIVE: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  BUILDER: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  CLUBHOUSE: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

export default function StrategyPage() {
  const [report, setReport] = useState<StrategyReport | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStrategy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/strategy");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate strategy");
      setReport(data.report);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Strategy</h1>
          <p className="text-muted-foreground text-sm mt-1">
            AI-powered analysis of your content engine — gaps, cadence, and what to build next.
          </p>
        </div>
        <button
          onClick={fetchStrategy}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Analyzing…" : report ? "Refresh" : "Generate Strategy"}
        </button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!report && !loading && !error && (
        <Card>
          <CardContent className="pt-10 pb-12 text-center">
            <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Click <strong>Generate Strategy</strong> to get an AI analysis of your content mix,
              posting cadence, gaps, and a recommended focus for the week.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-1/3 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-5/6 rounded bg-muted" />
                <div className="h-3 w-4/6 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {report && (
        <>
          {generatedAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Generated {new Date(generatedAt).toLocaleString()}
            </p>
          )}

          {/* Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Strategic Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{report.summary}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Content Mix */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-500" />
                  Content Mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{report.contentMix.analysis}</p>
                <ul className="space-y-1.5">
                  {report.contentMix.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Posting Cadence */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Posting Cadence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{report.postingCadence.analysis}</p>
                <ul className="space-y-1.5">
                  {report.postingCadence.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 mt-2" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Content Gaps */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Content Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.contentGaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Weekly Focus */}
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-emerald-500" />
                  This Week&apos;s Focus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    label={report.weeklyFocus.pillar}
                    colorClass={PILLAR_COLORS[report.weeklyFocus.pillar] ?? "bg-muted text-muted-foreground"}
                  />
                  <span className="text-muted-foreground text-xs">+</span>
                  <Badge
                    label={report.weeklyFocus.tone}
                    colorClass={TONE_COLORS[report.weeklyFocus.tone] ?? "bg-muted text-muted-foreground"}
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.weeklyFocus.reasoning}</p>
              </CardContent>
            </Card>
          </div>

          {/* Topic Ideas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Topic Ideas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {report.topicIdeas.map((idea, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <span className="text-xs font-bold text-muted-foreground mt-0.5 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-snug">{idea.topic}</p>
                      <p className="text-xs text-muted-foreground">{idea.angle}</p>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <Badge
                          label={idea.pillar}
                          colorClass={PILLAR_COLORS[idea.pillar] ?? "bg-muted text-muted-foreground"}
                        />
                        <Badge
                          label={idea.tone}
                          colorClass={TONE_COLORS[idea.tone] ?? "bg-muted text-muted-foreground"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {report.actionItems.map((action, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
