"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Flame,
  ExternalLink,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { Trend } from "@/lib/trends";
import type { TrendTopic } from "@/lib/ai/trends";

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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
      {label}
    </span>
  );
}

function formatVolume(n?: number): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface TrendCardProps {
  trend: Trend;
  active: boolean;
  generating: boolean;
  onGenerate: (trend: Trend) => void;
}

function TrendCard({ trend, active, generating, onGenerate }: TrendCardProps) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors cursor-pointer hover:border-primary/50 ${
        active ? "border-primary bg-primary/5" : "border-border"
      }`}
      onClick={() => onGenerate(trend)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug line-clamp-2">{trend.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {trend.source === "reddit" && trend.subreddit && (
              <span className="text-xs text-muted-foreground">r/{trend.subreddit}</span>
            )}
            {trend.volume && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                {trend.source === "x" ? (
                  <MessageSquare className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {formatVolume(trend.volume)}
              </span>
            )}
            {trend.pillarHint && (
              <Badge
                label={trend.pillarHint}
                colorClass={PILLAR_COLORS[trend.pillarHint] ?? "bg-muted text-muted-foreground"}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {trend.url && (
            <a
              href={trend.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            className="p-1 rounded hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              onGenerate(trend);
            }}
            title="Generate topics for this trend"
          >
            {generating && active ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  const router = useRouter();

  const [xTrends, setXTrends] = useState<Trend[]>([]);
  const [redditTrends, setRedditTrends] = useState<Trend[]>([]);
  const [trendErrors, setTrendErrors] = useState<string[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const [activeTrend, setActiveTrend] = useState<Trend | null>(null);
  const [topics, setTopics] = useState<TrendTopic[]>([]);
  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [customTrend, setCustomTrend] = useState("");
  const [activeTab, setActiveTab] = useState<"x" | "reddit">("reddit");

  async function loadTrends() {
    setLoadingTrends(true);
    setTrendErrors([]);
    try {
      const res = await fetch("/api/trends");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load trends");
      setXTrends(data.xTrends ?? []);
      setRedditTrends(data.redditTrends ?? []);
      setTrendErrors(data.errors ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load trends");
    } finally {
      setLoadingTrends(false);
    }
  }

  async function generateTopicsForTrend(trend: Trend) {
    setActiveTrend(trend);
    setTopics([]);
    setTopicError(null);
    setGeneratingTopics(true);
    try {
      const res = await fetch("/api/trends/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trendName: trend.name,
          pillarHint: trend.pillarHint,
          subreddit: trend.subreddit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Topic generation failed");
      setTopics(data.topics ?? []);
    } catch (err) {
      setTopicError(err instanceof Error ? err.message : "Topic generation failed");
    } finally {
      setGeneratingTopics(false);
    }
  }

  async function generateTopicsFromCustom() {
    const name = customTrend.trim();
    if (!name) return;
    await generateTopicsForTrend({ id: "custom", name, source: "reddit" });
  }

  function openInStudio(topic: TrendTopic) {
    const params = new URLSearchParams({
      topic: topic.topic,
      pillar: topic.pillar,
      tone: topic.tone,
    });
    router.push(`/studio?${params.toString()}`);
  }

  useEffect(() => {
    loadTrends();
  }, []);

  const visibleTrends = activeTab === "x" ? xTrends : redditTrends;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            Trending Topics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Discover what&apos;s trending, then let AI map it to brand-aligned content ideas.
          </p>
        </div>
        <button
          onClick={loadTrends}
          disabled={loadingTrends}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-60 transition-colors shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loadingTrends ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Custom trend input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            Generate Topics from Any Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., AI is replacing jobs, electric motorcycles, work-life balance..."
              value={customTrend}
              onChange={(e) => setCustomTrend(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateTopicsFromCustom()}
              className="flex-1"
            />
            <button
              onClick={generateTopicsFromCustom}
              disabled={!customTrend.trim() || generatingTopics}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors shrink-0"
            >
              {generatingTopics && activeTrend?.id === "custom" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Trend list */}
        <div className="space-y-4">
          {/* Source tabs */}
          <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
            <button
              onClick={() => setActiveTab("reddit")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === "reddit"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              Reddit Hot
              {redditTrends.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({redditTrends.length})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("x")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === "x"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              X Trending
              {xTrends.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({xTrends.length})</span>
              )}
            </button>
          </div>

          {/* Errors */}
          {trendErrors.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 space-y-1">
              {trendErrors.map((e, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {e}
                </p>
              ))}
            </div>
          )}

          {/* X not configured notice */}
          {activeTab === "x" && xTrends.length === 0 && !loadingTrends && (
            <Card>
              <CardContent className="pt-6 text-center py-10">
                <p className="text-sm text-muted-foreground">
                  X/Twitter credentials not configured.
                  <br />
                  Set <code className="bg-muted px-1 rounded text-xs">X_API_KEY</code>,{" "}
                  <code className="bg-muted px-1 rounded text-xs">X_API_SECRET</code>,{" "}
                  <code className="bg-muted px-1 rounded text-xs">X_ACCESS_TOKEN</code>, and{" "}
                  <code className="bg-muted px-1 rounded text-xs">X_ACCESS_SECRET</code> in{" "}
                  <code className="bg-muted px-1 rounded text-xs">.env</code>.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading skeleton */}
          {loadingTrends && (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg border p-3 animate-pulse">
                  <div className="h-4 w-4/5 rounded bg-muted mb-2" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                </div>
              ))}
            </div>
          )}

          {/* Trend list */}
          {!loadingTrends && visibleTrends.length > 0 && (
            <div className="space-y-2">
              {visibleTrends.map((trend) => (
                <TrendCard
                  key={trend.id}
                  trend={trend}
                  active={activeTrend?.id === trend.id}
                  generating={generatingTopics}
                  onGenerate={generateTopicsForTrend}
                />
              ))}
            </div>
          )}

          {!loadingTrends && visibleTrends.length === 0 && activeTab === "reddit" && (
            <Card>
              <CardContent className="pt-6 text-center py-10">
                <p className="text-sm text-muted-foreground">
                  No trending posts loaded yet. Click <strong>Refresh</strong> to fetch.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: AI topic ideas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">AI Topic Ideas</h2>
            {activeTrend && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                for &quot;{activeTrend.name}&quot;
              </span>
            )}
          </div>

          {/* Idle state */}
          {!activeTrend && !generatingTopics && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Click a trend on the left or enter a custom trend above to generate brand-aligned
                  content ideas.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Generating */}
          {generatingTopics && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-20 rounded-full bg-muted" />
                      <div className="h-5 w-16 rounded-full bg-muted" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error */}
          {topicError && !generatingTopics && (
            <Card className="border-destructive">
              <CardContent className="pt-4">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {topicError}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Topic cards */}
          {!generatingTopics && topics.length > 0 && (
            <div className="space-y-3">
              {topics.map((topic, i) => (
                <Card key={i} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-4 pb-4 space-y-2">
                    <p className="text-sm font-semibold leading-snug">{topic.topic}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{topic.angle}</p>
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          label={topic.pillar}
                          colorClass={PILLAR_COLORS[topic.pillar] ?? "bg-muted text-muted-foreground"}
                        />
                        <Badge
                          label={topic.tone}
                          colorClass={TONE_COLORS[topic.tone] ?? "bg-muted text-muted-foreground"}
                        />
                      </div>
                      <button
                        onClick={() => openInStudio(topic)}
                        className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                      >
                        Open in Studio
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
