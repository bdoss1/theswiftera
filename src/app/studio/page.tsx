"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FacebookPreview } from "@/components/facebook-preview";
import { Loader2, Save, Sparkles, Eye, EyeOff, ImagePlus, Upload, X } from "lucide-react";
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
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "X", label: "X / Twitter" },
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
  { value: "IMAGE", label: "Image Post" },
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

const IMAGE_SOURCES = [
  { value: "generate", label: "Generate with AI" },
  { value: "upload", label: "Upload Image" },
  { value: "variation", label: "Variation from Upload" },
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

  // Image state
  const [imageSource, setImageSource] = useState("generate");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      return data.imageUrl as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      return null;
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.info("Uploading image...");
    const url = await handleUploadFile(file);
    if (url) {
      setUploadedFileUrl(url);
      if (imageSource === "upload") {
        setImageUrl(url);
        toast.success("Image uploaded");
      } else {
        toast.success("Reference image uploaded");
      }
    }
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) {
      toast.error("Enter an image prompt");
      return;
    }

    setGeneratingImage(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate", prompt: imagePrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed");
      setImageUrl(data.imageUrl);
      toast.success("Image generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleCreateVariation() {
    if (!uploadedFileUrl) {
      toast.error("Upload a reference image first");
      return;
    }

    setGeneratingImage(true);
    try {
      const res = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "variation", referenceImageUrl: uploadedFileUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Variation generation failed");
      setImageUrl(data.imageUrl);
      toast.success("Image variation created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Variation generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }

  function clearImage() {
    setImageUrl(null);
    setUploadedFileUrl(null);
    setImagePrompt("");
  }

  async function handleGenerate() {
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
            imageUrl: postType === "IMAGE" ? imageUrl : undefined,
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
            imageUrl: postType === "IMAGE" ? imageUrl : undefined,
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
              <Select value={postType} onValueChange={(v) => { setPostType(v); if (v !== "IMAGE") clearImage(); }}>
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

            {postType === "IMAGE" && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-2">
                  <Label>Image Source</Label>
                  <Select value={imageSource} onValueChange={(v) => { setImageSource(v); setImageUrl(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMAGE_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {imageSource === "generate" && (
                  <div className="space-y-2">
                    <Label>Image Prompt</Label>
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g., A rider on a motorcycle at sunset with Dallas skyline in the background, cinematic lighting..."
                      rows={3}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={handleGenerateImage}
                      disabled={generatingImage || !imagePrompt.trim()}
                    >
                      {generatingImage
                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating Image...</>
                        : <><ImagePlus className="h-3 w-3" /> Generate Image</>}
                    </Button>
                  </div>
                )}

                {imageSource === "upload" && (
                  <div className="space-y-2">
                    <Label>Upload Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                  </div>
                )}

                {imageSource === "variation" && (
                  <div className="space-y-2">
                    <Label>Upload Reference Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                    {uploadedFileUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={handleCreateVariation}
                        disabled={generatingImage}
                      >
                        {generatingImage
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Creating Variation...</>
                          : <><ImagePlus className="h-3 w-3" /> Create Variation</>}
                      </Button>
                    )}
                  </div>
                )}

                {imageUrl && (
                  <div className="relative">
                    <img
                      src={imageUrl}
                      alt="Post image"
                      className="w-full rounded-md border object-cover max-h-48"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={clearImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
                {postType === "IMAGE" && imageUrl && (
                  <img src={imageUrl} alt="Post image" className="w-full rounded-md border object-cover max-h-64" />
                )}
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
                      imageUrl={postType === "IMAGE" ? imageUrl : null}
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
