"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  platform: string;
  postType: string;
  pillar: string;
  tone: string;
  status: string;
  caption: string;
  hashtags: string[];
  postedAt: string | null;
  externalPostId: string | null;
  error: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  POSTED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function HistoryPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [postedRes, failedRes] = await Promise.all([
        fetch("/api/content?status=POSTED"),
        fetch("/api/content?status=FAILED"),
      ]);
      const [posted, failed] = await Promise.all([postedRes.json(), failedRes.json()]);
      const all = [...posted.items, ...failed.items].sort(
        (a: ContentItem, b: ContentItem) => new Date(b.postedAt || b.createdAt).getTime() - new Date(a.postedAt || a.createdAt).getTime()
      );
      setItems(all);
      setLoading(false);
    }
    load();
  }, []);

  async function exportJSON() {
    try {
      const res = await fetch("/api/content/export?format=json");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `swifttok-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as JSON");
    } catch {
      toast.error("Export failed");
    }
  }

  async function exportCSV() {
    try {
      const res = await fetch("/api/content/export?format=csv");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `swifttok-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as CSV");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content History</h1>
          <p className="text-muted-foreground text-sm mt-1">Timeline of published and failed posts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportJSON}>
            <Download className="h-3 w-3" /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3 w-3" /> CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No published or failed posts yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge>
                    <Badge variant="outline">{item.pillar}</Badge>
                    <Badge variant="outline">{item.platform}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.postedAt
                      ? new Date(item.postedAt).toLocaleString()
                      : new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{item.caption}</p>
                {item.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.hashtags.map((h, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">#{h.replace(/^#/, "")}</Badge>
                    ))}
                  </div>
                )}
                {item.externalPostId && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Facebook Post ID: {item.externalPostId}
                  </p>
                )}
                {item.error && <p className="text-xs text-red-600">Error: {item.error}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
