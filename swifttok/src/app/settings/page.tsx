"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Save } from "lucide-react";

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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [fbPage, setFbPage] = useState<FBPage | null>(null);
  const [newPageId, setNewPageId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; pageName?: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
    fetch("/api/facebook").then((r) => r.json()).then((d) => {
      setFbPage(d.page);
      if (d.page) setNewPageId(d.page.pageId);
    });
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
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/facebook", { method: "PUT" });
    const data = await res.json();
    setTestResult(data);
    setTesting(false);
  }

  if (!settings) {
    return <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
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
            <Badge variant={process.env.NEXT_PUBLIC_OPENAI_STATUS === "missing" ? "destructive" : "secondary"}>
              Configured via environment
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label>Model:</Label>
            <Badge variant="outline">{process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-4o-mini (default)"}</Badge>
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
    </div>
  );
}
