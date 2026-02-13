"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Loader2, Save, Plus, Trash2, Upload, Gauge } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id: string;
  requireApproval: boolean;
  autoPostEnabled: boolean;
  dailyPostTarget: number;
  strictMode: boolean;
  blockedWords: string;
}

interface FBPage {
  id: string;
  pageId: string;
  pageName: string | null;
  tokenSet: boolean;
}

interface PromptTemplate {
  id: string;
  name: string;
  pillar: string;
  tone: string;
  templateText: string;
}

interface RateLimitInfo {
  platform: string;
  endpoint: string;
  callCount: number;
  limitPerWindow: number;
  windowMinutes: number;
  lastCallAt: string;
}

const PILLARS = ["BROTHERHOOD", "LEADERSHIP", "HUMOR", "ENTREPRENEURSHIP", "FAMILY"];
const TONES = ["LEADER", "FUNNY", "REFLECTIVE", "BUILDER", "CLUBHOUSE"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fbPage, setFbPage] = useState<FBPage | null>(null);
  const [newPageId, setNewPageId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; pageName?: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingTpl, setEditingTpl] = useState<PromptTemplate | null>(null);
  const [newTpl, setNewTpl] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", pillar: "BROTHERHOOD", tone: "LEADER", templateText: "" });
  const [rateLimits, setRateLimits] = useState<RateLimitInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
    fetch("/api/facebook").then((r) => r.json()).then((d) => {
      setFbPage(d.page);
      if (d.page) setNewPageId(d.page.pageId);
    });
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates));
    fetch("/api/rate-limit").then((r) => r.json()).then((d) => setRateLimits(d.limits || []));
  }, []);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    toast.success("Settings saved");
  }

  async function saveFacebook() {
    if (!newPageId || !newToken) return;
    setSaving(true);
    const res = await fetch("/api/facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: newPageId, pageAccessToken: newToken }),
    });
    const data = await res.json();
    if (data.page) setFbPage(data.page);
    setNewToken("");
    setSaving(false);
    toast.success("Facebook config saved");
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/facebook", { method: "PUT" });
    const data = await res.json();
    setTestResult(data);
    setTesting(false);
    if (data.success) toast.success(`Connected: ${data.pageName}`);
    else toast.error(data.error || "Connection test failed");
  }

  async function saveTemplate() {
    try {
      if (editingTpl) {
        await fetch(`/api/templates/${editingTpl.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tplForm),
        });
        toast.success("Template updated");
      } else {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tplForm),
        });
        toast.success("Template created");
      }
      setEditingTpl(null);
      setNewTpl(false);
      setTplForm({ name: "", pillar: "BROTHERHOOD", tone: "LEADER", templateText: "" });
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data.templates);
    } catch {
      toast.error("Failed to save template");
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    toast.success("Template deleted");
    const res = await fetch("/api/templates");
    const data = await res.json();
    setTemplates(data.templates);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = data.items || data;
      const res = await fetch("/api/content/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: Array.isArray(items) ? items : [items] }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Imported ${result.imported} of ${result.total} items`);
      } else {
        toast.error(result.error || "Import failed");
      }
    } catch {
      toast.error("Invalid JSON file");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!settings) {
    return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your SwiftTok content engine.</p>
      </div>

      {/* OpenAI */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAI</CardTitle>
          <CardDescription>API key is configured via .env.local</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Status:</Label>
            <Badge variant="secondary">Configured via environment</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label>Model:</Label>
            <Badge variant="outline">gpt-4o-mini (default)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Facebook */}
      <Card>
        <CardHeader>
          <CardTitle>Facebook Page</CardTitle>
          <CardDescription>Connect your Facebook Page for publishing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fbPage && (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Connected: <strong>{fbPage.pageName || fbPage.pageId}</strong></span>
              {fbPage.tokenSet && <Badge variant="secondary">Token set</Badge>}
            </div>
          )}
          <div className="space-y-2">
            <Label>Page ID</Label>
            <Input value={newPageId} onChange={(e) => setNewPageId(e.target.value)} placeholder="123456789" />
          </div>
          <div className="space-y-2">
            <Label>Page Access Token</Label>
            <Input type="password" value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="Enter new token..." />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveFacebook} disabled={saving || !newPageId || !newToken}>
              <Save className="h-4 w-4" /> Save Facebook Config
            </Button>
            <Button variant="outline" onClick={testConnection} disabled={testing || !fbPage}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Test Connection
            </Button>
          </div>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${testResult.success ? "text-green-600" : "text-red-600"}`}>
              {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.success ? `Connected: ${testResult.pageName}` : `Error: ${testResult.error}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gauge className="h-4 w-4" /> API Rate Limits</CardTitle>
          <CardDescription>Facebook Graph API usage tracking</CardDescription>
        </CardHeader>
        <CardContent>
          {rateLimits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API calls tracked yet. Rate limits will appear after the first publish.</p>
          ) : (
            <div className="space-y-3">
              {rateLimits.map((rl) => {
                const pct = Math.round((rl.callCount / rl.limitPerWindow) * 100);
                const color = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-green-500";
                return (
                  <div key={`${rl.platform}-${rl.endpoint}`} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{rl.platform} / {rl.endpoint}</span>
                      <span className="text-muted-foreground">{rl.callCount} / {rl.limitPerWindow} ({rl.windowMinutes}m window)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last call: {new Date(rl.lastCallAt).toLocaleString()}
                      {pct > 80 && <span className="text-red-600 font-medium ml-2">Approaching limit!</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
          <CardDescription>Content approval and posting behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Approval</Label>
              <p className="text-xs text-muted-foreground">Drafts must be approved before publishing</p>
            </div>
            <Switch checked={settings.requireApproval} onCheckedChange={(v) => setSettings({ ...settings, requireApproval: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Post Enabled</Label>
              <p className="text-xs text-muted-foreground">Generated posts auto-approve and can be auto-scheduled</p>
            </div>
            <Switch checked={settings.autoPostEnabled} onCheckedChange={(v) => setSettings({ ...settings, autoPostEnabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Strict Mode</Label>
              <p className="text-xs text-muted-foreground">Force approval even when auto-post is enabled</p>
            </div>
            <Switch checked={settings.strictMode} onCheckedChange={(v) => setSettings({ ...settings, strictMode: v })} />
          </div>
          <div className="space-y-2">
            <Label>Daily Post Target</Label>
            <Input type="number" min={1} max={20} value={settings.dailyPostTarget} onChange={(e) => setSettings({ ...settings, dailyPostTarget: Number(e.target.value) })} className="w-20" />
          </div>
        </CardContent>
      </Card>

      {/* Safety */}
      <Card>
        <CardHeader>
          <CardTitle>Safety</CardTitle>
          <CardDescription>Content filtering and safety controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Blocked Words</Label>
            <Textarea
              value={settings.blockedWords}
              onChange={(e) => setSettings({ ...settings, blockedWords: e.target.value })}
              placeholder="word1, word2, word3"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Comma-separated. Generated content containing these words will be filtered out.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save All Settings
      </Button>

      {/* Prompt Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Prompt Templates</span>
            <Button size="sm" variant="outline" onClick={() => {
              setNewTpl(true);
              setEditingTpl(null);
              setTplForm({ name: "", pillar: "BROTHERHOOD", tone: "LEADER", templateText: "" });
            }}>
              <Plus className="h-3 w-3" /> New Template
            </Button>
          </CardTitle>
          <CardDescription>Manage the AI prompt templates used for content generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(newTpl || editingTpl) && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="Template name" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Pillar</Label>
                      <Select value={tplForm.pillar} onValueChange={(v) => setTplForm({ ...tplForm, pillar: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PILLARS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tone</Label>
                      <Select value={tplForm.tone} onValueChange={(v) => setTplForm({ ...tplForm, tone: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Template Text</Label>
                  <Textarea value={tplForm.templateText} onChange={(e) => setTplForm({ ...tplForm, templateText: e.target.value })} rows={5} placeholder="Instructions for the AI..." />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveTemplate} disabled={!tplForm.name || !tplForm.templateText}>
                    <Save className="h-3 w-3" /> {editingTpl ? "Update" : "Create"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setNewTpl(false); setEditingTpl(null); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-start gap-3 p-3 rounded-md border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tpl.name}</p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">{tpl.pillar}</Badge>
                  <Badge variant="secondary" className="text-xs">{tpl.tone}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.templateText}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditingTpl(tpl);
                  setNewTpl(false);
                  setTplForm({ name: tpl.name, pillar: tpl.pillar, tone: tpl.tone, templateText: tpl.templateText });
                }}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteTemplate(tpl.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {templates.length === 0 && !newTpl && (
            <p className="text-sm text-muted-foreground text-center py-4">No templates. Run <code className="bg-muted px-1 rounded text-xs">pnpm prisma:seed</code> to load defaults.</p>
          )}
        </CardContent>
      </Card>

      {/* Import/Export */}
      <Card>
        <CardHeader>
          <CardTitle>Import / Export</CardTitle>
          <CardDescription>Backup or restore your content library</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import JSON
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <p className="text-xs text-muted-foreground self-center">
              Upload a JSON file with content items to import as drafts.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Export is available on the History page (JSON or CSV format).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
