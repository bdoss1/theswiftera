"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Clapperboard,
  Loader2,
  Sparkles,
  Copy,
  Check,
  Music,
  Eye,
  Clock,
  Mic,
  Type,
  Camera,
  Save,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { ReelScript, ReelScene } from "@/lib/ai/reels";

const PLATFORMS = [
  { value: "INSTAGRAM", label: "Instagram Reels" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "FACEBOOK", label: "Facebook Reels" },
  { value: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
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

const DURATIONS = [
  { value: 30, label: "30 seconds" },
  { value: 45, label: "45 seconds" },
  { value: 60, label: "60 seconds" },
];

const CTA_STYLES = [
  { value: "none", label: "None" },
  { value: "question", label: "Question" },
  { value: "subscribe", label: "Subscribe / Follow" },
  { value: "comment_bait", label: "Comment Bait" },
];

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium border hover:bg-accent transition-colors ${className ?? ""}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function SceneCard({ scene, index }: { scene: ReelScene; index: number }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Scene header */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
          {index + 1}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Clock className="h-3 w-3" />
          {scene.timestamp}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Visual */}
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Camera className="h-3 w-3" /> Visual
          </p>
          <p className="text-sm leading-relaxed">{scene.visual}</p>
        </div>

        {/* Voiceover */}
        {scene.voiceover && (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Mic className="h-3 w-3" /> Voiceover
            </p>
            <p className="text-sm italic leading-relaxed text-foreground/80">
              &ldquo;{scene.voiceover}&rdquo;
            </p>
          </div>
        )}

        {/* Text overlay */}
        {scene.textOverlay && (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <Type className="h-3 w-3" /> On-Screen Text
            </p>
            <p className="rounded bg-black/80 px-3 py-1.5 text-sm font-bold text-white text-center">
              {scene.textOverlay}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function buildFullScript(script: ReelScript): string {
  const lines: string[] = [
    `REEL SCRIPT: ${script.title}`,
    `Duration: ${script.duration}s`,
    "",
    `🎣 HOOK: ${script.hook}`,
    "",
    "── SCENES ──",
  ];

  script.scenes.forEach((s, i) => {
    lines.push(`\nScene ${i + 1} [${s.timestamp}]`);
    lines.push(`  📷 Visual: ${s.visual}`);
    if (s.voiceover) lines.push(`  🎙 Voiceover: "${s.voiceover}"`);
    if (s.textOverlay) lines.push(`  📝 Text: ${s.textOverlay}`);
  });

  lines.push("", `🎵 Music: ${script.musicMood}`);
  lines.push("", "── POST ──");
  lines.push(`Caption: ${script.caption}`);
  lines.push(`Hashtags: ${script.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`);
  lines.push(`CTA: ${script.cta}`);

  return lines.join("\n");
}

export default function ReelsPage() {
  const router = useRouter();

  const [platform, setPlatform] = useState("INSTAGRAM");
  const [pillar, setPillar] = useState("BROTHERHOOD");
  const [tone, setTone] = useState("LEADER");
  const [duration, setDuration] = useState<30 | 45 | 60>(30);
  const [ctaStyle, setCtaStyle] = useState("question");
  const [topic, setTopic] = useState("");

  const [script, setScript] = useState<ReelScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/reels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, pillar, tone, duration, ctaStyle, topic: topic || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setScript(data.script);
      toast.success("Reel script generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!script) return;
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            pillar,
            tone,
            postType: "TEXT",
            platform,
            caption: script.caption,
            hashtags: script.hashtags,
            topic: script.title,
          }],
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      toast.success("Caption saved as draft");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function openInStudio() {
    if (!script) return;
    const params = new URLSearchParams({ topic: script.title, pillar, tone });
    router.push(`/studio?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clapperboard className="h-6 w-6 text-primary" />
          Reel Scriptwriter
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-generated 30–60 second reel scripts with scene-by-scene direction, voiceover, and captions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings panel */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Reel Settings</CardTitle>
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
              <Label>Duration</Label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value as 30 | 45 | 60)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      duration === d.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    {d.value}s
                  </button>
                ))}
              </div>
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
              <Label>CTA Style</Label>
              <Select value={ctaStyle} onValueChange={setCtaStyle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CTA_STYLES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic / Concept (optional)</Label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., riding through Dallas at night, lessons I learned building my first app..."
                rows={3}
              />
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating Script...</>
                : <><Sparkles className="h-4 w-4" /> Generate Reel Script</>}
            </Button>
          </CardContent>
        </Card>

        {/* Script output */}
        <div className="lg:col-span-2 space-y-4">
          {!script && !loading && (
            <Card>
              <CardContent className="py-16 text-center">
                <Clapperboard className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Configure your settings and click Generate to create a full reel script with
                  scenes, voiceover lines, and posting caption.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Writing your reel script...</p>
              </CardContent>
            </Card>
          )}

          {script && !loading && (
            <>
              {/* Script header */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
                        Reel Title
                      </p>
                      <h2 className="text-lg font-bold">{script.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />{script.duration}s
                      </Badge>
                      <Badge variant="outline">{script.scenes.length} scenes</Badge>
                    </div>
                  </div>

                  {/* Hook */}
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                      Hook (first 2–3 seconds)
                    </p>
                    <p className="text-base font-semibold text-amber-900 dark:text-amber-200">
                      {script.hook}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <CopyButton text={buildFullScript(script)} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={saving || saved}
                    >
                      {saved
                        ? <><Check className="h-3.5 w-3.5 text-green-600" /> Saved</>
                        : saving
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</>
                        : <><Save className="h-3.5 w-3.5" /> Save Caption as Draft</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={openInStudio}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in Studio
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Scene timeline */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  Scene Breakdown
                </h3>
                <div className="space-y-3">
                  {script.scenes.map((scene, i) => (
                    <SceneCard key={i} scene={scene} index={i} />
                  ))}
                </div>
              </div>

              {/* Music + Caption */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Music */}
                <Card>
                  <CardContent className="pt-4 pb-4 space-y-1">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Music className="h-3.5 w-3.5" /> Music Mood
                    </p>
                    <p className="text-sm leading-relaxed">{script.musicMood}</p>
                  </CardContent>
                </Card>

                {/* CTA */}
                <Card>
                  <CardContent className="pt-4 pb-4 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      End-of-Reel CTA
                    </p>
                    <p className="text-sm leading-relaxed italic">&ldquo;{script.cta}&rdquo;</p>
                  </CardContent>
                </Card>
              </div>

              {/* Caption & Hashtags */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Post Caption & Hashtags</CardTitle>
                    <CopyButton
                      text={`${script.caption}\n\n${script.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{script.caption}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {script.hashtags.map((h, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        #{h.replace(/^#/, "")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
