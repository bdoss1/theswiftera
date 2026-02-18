"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FacebookPreview } from "@/components/facebook-preview";
import { Check, X, Clock, Send, Pencil, Trash2, Loader2, Eye, EyeOff, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  platform: string;
  postType: string;
  pillar: string;
  tone: string;
  status: string;
  topic: string | null;
  caption: string;
  linkUrl: string | null;
  hashtags: string[];
  scheduledFor: string | null;
  postedAt: string | null;
  externalPostId: string | null;
  error: string | null;
  createdAt: string;
  publishJob: { status: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  READY_FOR_REVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  POSTED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export default function ReviewPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (pillarFilter !== "all") params.set("pillar", pillarFilter);
    const res = await fetch(`/api/content?${params}`);
    const data = await res.json();
    setItems(data.items);
    setSelectedIds(new Set());
    setLoading(false);
  }, [statusFilter, pillarFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success(`Marked as ${status.replace(/_/g, " ").toLowerCase()}`);
      await fetchItems();
    } catch {
      toast.error("Update failed");
    } finally {
      setActionLoading(null);
    }
  }, [fetchItems]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingId || scheduleId) return; // Don't capture when editing
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      const currentItem = items[focusIdx];
      if (!currentItem) return;

      switch (e.key.toLowerCase()) {
        case "j": // Next item
          e.preventDefault();
          setFocusIdx((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "k": // Previous item
          e.preventDefault();
          setFocusIdx((prev) => Math.max(prev - 1, 0));
          break;
        case "a": // Approve
          if (currentItem.status === "READY_FOR_REVIEW") {
            e.preventDefault();
            updateStatus(currentItem.id, "APPROVED");
          }
          break;
        case "r": // Reject
          if (currentItem.status === "READY_FOR_REVIEW") {
            e.preventDefault();
            updateStatus(currentItem.id, "DRAFT");
          }
          break;
        case "x": // Toggle selection
          e.preventDefault();
          toggleSelect(currentItem.id);
          break;
        case "p": // Preview
          e.preventDefault();
          setPreviewId(previewId === currentItem.id ? null : currentItem.id);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, focusIdx, editingId, scheduleId, previewId, updateStatus]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  }

  async function bulkUpdateStatus(status: string) {
    if (selectedIds.size === 0) return;
    setActionLoading("bulk");
    try {
      const res = await fetch("/api/content/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Updated ${data.updated} item(s) to ${status}`);
      await fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function saveEdit(id: string) {
    setActionLoading(id);
    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: editCaption }),
    });
    setEditingId(null);
    toast.success("Caption updated");
    await fetchItems();
    setActionLoading(null);
  }

  async function scheduleItem(id: string) {
    if (!scheduleTime) return;
    setActionLoading(id);
    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: new Date(scheduleTime).toISOString(), status: "SCHEDULED" }),
    });
    setScheduleId(null);
    setScheduleTime("");
    toast.success("Post scheduled");
    await fetchItems();
    setActionLoading(null);
  }

  async function publishNow(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/content/${id}/publish`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success("Published to Facebook");
    } else {
      toast.error(data.error || "Publish failed");
    }
    await fetchItems();
    setActionLoading(null);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    toast.success("Item deleted");
    await fetchItems();
  }

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review, approve, and manage your content pipeline.
            <span className="hidden sm:inline text-xs ml-2 opacity-60">Keys: J/K navigate, A approve, R reject, X select, P preview</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="READY_FOR_REVIEW">Ready for Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="POSTED">Posted</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pillarFilter} onValueChange={setPillarFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by pillar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pillars</SelectItem>
            <SelectItem value="BROTHERHOOD">Brotherhood</SelectItem>
            <SelectItem value="LEADERSHIP">Leadership</SelectItem>
            <SelectItem value="HUMOR">Humor</SelectItem>
            <SelectItem value="ENTREPRENEURSHIP">Entrepreneurship</SelectItem>
            <SelectItem value="FAMILY">Family</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchItems}>Refresh</Button>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button size="sm" onClick={() => bulkUpdateStatus("APPROVED")} disabled={actionLoading === "bulk"}>
              <Check className="h-3 w-3" /> Approve Selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("READY_FOR_REVIEW")} disabled={actionLoading === "bulk"}>
              Mark for Review
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("DRAFT")} disabled={actionLoading === "bulk"}>
              <X className="h-3 w-3" /> Reject Selected
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No content items found. Generate some in Studio.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {selectedIds.size === items.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              <span className="text-xs">{selectedIds.size === items.length ? "Deselect All" : "Select All"}</span>
            </Button>
          </div>

          {items.map((item, idx) => (
            <Card
              key={item.id}
              className={`transition-all ${idx === focusIdx ? "ring-2 ring-primary/50" : ""} ${selectedIds.has(item.id) ? "bg-accent/50" : ""}`}
              onClick={() => setFocusIdx(idx)}
            >
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className="text-muted-foreground hover:text-foreground">
                      {selectedIds.has(item.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={STATUS_COLORS[item.status] || ""}>{item.status.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline">{item.pillar}</Badge>
                      <Badge variant="outline">{item.tone}</Badge>
                      <Badge variant="outline">{item.postType}</Badge>
                      <Badge variant="outline">{item.platform}</Badge>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {editingId === item.id ? (
                  <div className="space-y-2">
                    <Textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} rows={4} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(item.id)} disabled={actionLoading === item.id}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{item.caption}</p>
                )}

                {item.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.hashtags.map((h, i) => <Badge key={i} variant="secondary" className="text-xs">#{h.replace(/^#/, "")}</Badge>)}
                  </div>
                )}

                {item.error && <p className="text-xs text-red-600">Error: {item.error}</p>}
                {item.scheduledFor && <p className="text-xs text-muted-foreground">Scheduled: {new Date(item.scheduledFor).toLocaleString()}</p>}
                {item.postedAt && <p className="text-xs text-green-600">Posted: {new Date(item.postedAt).toLocaleString()}</p>}

                {previewId === item.id && (
                  <div className="pt-2">
                    <FacebookPreview caption={item.caption} hashtags={item.hashtags} linkUrl={item.linkUrl} />
                  </div>
                )}

                {scheduleId === item.id && (
                  <div className="flex gap-2 items-end">
                    <Input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-auto" />
                    <Button size="sm" onClick={() => scheduleItem(item.id)} disabled={!scheduleTime || actionLoading === item.id}>Schedule</Button>
                    <Button size="sm" variant="outline" onClick={() => setScheduleId(null)}>Cancel</Button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {(item.status === "DRAFT" || item.status === "FAILED") && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "READY_FOR_REVIEW")} disabled={actionLoading === item.id}>
                      Mark for Review
                    </Button>
                  )}
                  {item.status === "READY_FOR_REVIEW" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(item.id, "APPROVED")} disabled={actionLoading === item.id}>
                        <Check className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "DRAFT")} disabled={actionLoading === item.id}>
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </>
                  )}
                  {item.status === "APPROVED" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => { setScheduleId(item.id); setScheduleTime(""); }}>
                        <Clock className="h-3 w-3" /> Schedule
                      </Button>
                      <Button size="sm" onClick={() => publishNow(item.id)} disabled={actionLoading === item.id}>
                        <Send className="h-3 w-3" /> Publish Now
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
                  >
                    {previewId === item.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                  {!["POSTED", "SCHEDULED"].includes(item.status) && editingId !== item.id && (
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(item.id); setEditCaption(item.caption); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {!["POSTED", "SCHEDULED"].includes(item.status) && (
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
