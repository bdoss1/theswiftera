"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, Wand2 } from "lucide-react";

interface ContentItem {
  id: string;
  pillar: string;
  tone: string;
  status: string;
  caption: string;
  scheduledFor: string | null;
  postType: string;
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetCount, setTargetCount] = useState(8);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/content?status=SCHEDULED&date=${selectedDate}`);
    const data = await res.json();
    setItems(data.items.sort((a: ContentItem, b: ContentItem) => {
      if (!a.scheduledFor || !b.scheduledFor) return 0;
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    }));
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function navigateDate(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(formatDate(d));
  }

  async function autoBuild() {
    setBuilding(true);
    setMessage("");
    try {
      const res = await fetch("/api/calendar/auto-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, targetCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-build failed");
      setMessage(data.message);
      await fetchItems();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Auto-build failed");
    } finally {
      setBuilding(false);
    }
  }

  async function moveItem(id: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    // Swap scheduled times
    const timeA = items[idx].scheduledFor;
    const timeB = items[swapIdx].scheduledFor;

    await Promise.all([
      fetch(`/api/content/${items[idx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: timeB }),
      }),
      fetch(`/api/content/${items[swapIdx].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: timeA }),
      }),
    ]);

    await fetchItems();
  }

  const dateObj = new Date(selectedDate + "T12:00:00");
  const dateLabel = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">Plan and schedule your daily content queue.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
        </div>
        <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{dateLabel}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Auto-Build Day Queue</span>
            <Badge variant="secondary">{items.length} scheduled</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Fill the day with approved posts spaced across peak engagement times (9am–9pm).
          </p>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Target posts</Label>
              <Input type="number" min={1} max={9} value={targetCount} onChange={(e) => setTargetCount(Number(e.target.value))} className="w-20" />
            </div>
            <Button onClick={autoBuild} disabled={building}>
              {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Auto-Build
            </Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No posts scheduled for this date. Use Auto-Build or schedule from Review.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <Card key={item.id}>
              <CardContent className="py-3 flex items-start gap-3">
                <div className="text-sm font-mono text-muted-foreground w-16 shrink-0 pt-0.5">
                  {item.scheduledFor ? new Date(item.scheduledFor).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm truncate">{item.caption.substring(0, 120)}{item.caption.length > 120 ? "..." : ""}</p>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-xs">{item.pillar}</Badge>
                    <Badge variant="secondary" className="text-xs">{item.tone}</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => moveItem(item.id, "up")} className="h-6 px-2 text-xs">Up</Button>
                  <Button variant="ghost" size="sm" disabled={idx === items.length - 1} onClick={() => moveItem(item.id, "down")} className="h-6 px-2 text-xs">Down</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
