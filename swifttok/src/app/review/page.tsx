"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Clock, Send, Pencil, Trash2, Loader2 } from "lucide-react";

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
  DRAFT: "bg-gray-100 text-gray-700",
  READY_FOR_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-amber-100 text-amber-700",
  POSTED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
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

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (pillarFilter !== "all") params.set("pillar", pillarFilter);
    const res = await fetch(`/api/content?${params}`);
    const data = await res.json();
    setItems(data.items);
    setLoading(false);
  }, [statusFilter, pillarFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchItems();
    setActionLoading(null);
  }

  async function saveEdit(id: string) {
    setActionLoading(id);
    await fetch(`/api/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: editCaption }),
    });
    setEditingId(null);
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
    await fetchItems();
    setActionLoading(null);
  }

  async function publishNow(id: string) {
    setActionLoading(id);
    await fetch(`/api/content/${id}/publish`, { method: "POST" });
    await fetchItems();
    setActionLoading(null);
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/content/${id}`, { method: "DELETE" });
    await fetchItems();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground text-sm mt-1">Review, approve, and manage your content pipeline.</p>
      </div>

      <div className="flex flex-wrap gap-3">
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
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No content items found. Generate some in Studio.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-4 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={STATUS_COLORS[item.status] || ""}>{item.status.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">{item.pillar}</Badge>
                    <Badge variant="outline">{item.tone}</Badge>
                    <Badge variant="outline">{item.postType}</Badge>
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
