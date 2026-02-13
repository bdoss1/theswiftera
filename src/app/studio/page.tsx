"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FacebookPreview } from "@/components/facebook-preview";
import { Loader2, Save, Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Variant {
  caption: string;
  hashtags: string[];
  cta: string;
  hook: string;
  saved?: boolean;
}

const PLATFORMS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram (coming soon)" },
  { value: "X", label: "X / Twitter (coming soon)" },
];

const PILLARS = [
  { value: "BROTHERHOOD", label: "Brotherhood & Motorcycle Culture" },
  { value: "LEADERSHIP", label: "Leadership & Motivation" },
  { value: "HUMOR", label: "Humor & Culture" },
  { value: "ENTREPRENEURSHIP", label: "Entrepreneurship & Tech" },
  { value: "FAMILY", label: "Family / Manhood" },
];

const TONES = [
  { value: "LEADER", label: "Confident / Leader" },
  { value: "FUNNY", label: "Funny / Relatable" },
  { value: "REFLECTIVE", label: "Reflective / Legacy" },
  { value: "BUILDER", label: "Hustle / Builder" },
  { value: "CLUBHOUSE", label: "Clubhouse / Set-Life" },
];

const POST_TYPES = [
  { value: "TEXT", label: "Text Post" },
  { value: "LINK", label: "Link Post" },
];

const LENGTHS = [
  { value: "short", label: "Short (punchy)" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long (story)" },
];

const CTA_STYLES = [
  { value: "none", label: "None" },
  { value: "question", label: "Question" },
  { value: "subscribe", label: "Subscribe / Follow" },
  { value: "comment_bait", label: "Comment Bait" },
];

export default function StudioPage() {
  const [platform, setPlatform] = useState("FACEBOOK");
  const [pillar, setPillar] = useState("BROTHERHOOD");
  const [tone, setTone] = useState("LEADER");
  const [postType, setPostType] = useState("TEXT");
  const [length, setLength] = useState("medium");
  const [ctaStyle, setCtaStyle] = useState("question");
  const [topic, setTopic] = useState("");
  const [variantCount, setVariantCount] = useState(5);
  const [linkUrl, setLinkUrl] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  async function handleGenerate() {
    if (platform !== "FACEBOOK") {
      toast.info(`${platform} publishing is coming soon. Generating Facebook-style content for now.`);
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar, tone, postType, length, ctaStyle, topic, variantCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setVariants(data.variants.map((v: Variant) => ({ ...v, saved: false })));
      toast.success(`Generated ${data.variants.length} variant(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(index: number) {
    const v = variants[index];
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            pillar, tone, postType, platform,
            caption: v.caption,
            hashtags: v.hashtags,
            topic: topic || undefined,
            linkUrl: postType === "LINK" ? linkUrl : undefined,
          }],
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setVariants((prev) => prev.map((item, i) => (i === index ? { ...item, saved: true } : item)));
      toast.success("Saved as draft");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll() {
    const unsaved = variants.filter((v) => !v.saved);
    if (unsaved.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: unsaved.map((v) => ({
            pillar, tone, postType, platform,
            caption: v.caption,
            hashtags: v.hashtags,
            topic: topic || undefined,
            linkUrl: postType === "LINK" ? linkUrl : undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setVariants((prev) => prev.map((item) => ({ ...item, saved: true })));
      toast.success(`Saved ${unsaved.length} draft(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Studio</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate on-brand content for The Swift Era.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Generation Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Pillar</Label>
              <Select value={pillar} onValueChange={setPillar}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PILLARS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Post Type</Label>
              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {postType === "LINK" && (
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}

            <div className="space-y-2">
              <Label>Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LENGTHS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>CTA Style</Label>
              <Select value={ctaStyle} onValueChange={setCtaStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CTA_STYLES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic (optional)</Label>
              <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Sunday ride lessons, building an AI app..." rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Variants (1-10)</Label>
              <Input type="number" min={1} max={10} value={variantCount} onChange={(e) => setVariantCount(Number(e.target.value))} />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate</>}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {variants.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{variants.length} variant(s) generated</p>
              <Button variant="outline" size="sm" onClick={handleSaveAll} disabled={saving || variants.every((v) => v.saved)}>
                <Save className="h-3 w-3" /> Save All as Drafts
              </Button>
            </div>
          )}

          {variants.map((v, i) => (
            <Card key={i} className={v.saved ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" : ""}>
              <CardContent className="pt-6 space-y-3">
                {v.hook && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hook: {v.hook}</p>}
                <p className="whitespace-pre-wrap text-sm">{v.caption}</p>
                <div className="flex flex-wrap gap-1">
                  {v.hashtags.map((h, j) => (
                    <Badge key={j} variant="secondary" className="text-xs">#{h.replace(/^#/, "")}</Badge>
                  ))}
                </div>
                {v.cta && <p className="text-xs text-muted-foreground italic">CTA: {v.cta}</p>}
                <div className="flex items-center gap-2">
                  {v.saved ? (
                    <Badge variant="outline" className="text-green-600">Saved</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleSave(i)} disabled={saving}>
                      <Save className="h-3 w-3" /> Save as Draft
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewIdx(previewIdx === i ? null : i)}
                  >
                    {previewIdx === i ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {previewIdx === i ? "Hide Preview" : "Preview"}
                  </Button>
                </div>
                {previewIdx === i && (
                  <div className="pt-2">
                    <FacebookPreview
                      caption={v.caption}
                      hashtags={v.hashtags}
                      linkUrl={postType === "LINK" ? linkUrl : null}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {variants.length === 0 && !loading && (
            <Card>
              <CardContent className="pt-6 text-center text-sm text-muted-foreground py-12">
                Configure your settings and click Generate to create content variants.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
