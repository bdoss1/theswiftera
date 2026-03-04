import { z } from "zod";
import { config } from "@/lib/config";
import { createChildLogger } from "@/lib/logger";
import { BRAND_SYSTEM_PROMPT, PILLAR_CONTEXT, TONE_CONTEXT, CTA_STYLES } from "./prompts";
import type { Pillar, Tone } from "@prisma/client";

const log = createChildLogger("ai:reels");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SceneSchema = z.object({
  timestamp: z.string(),       // e.g. "0:00–0:06"
  visual: z.string(),          // what to film / show
  voiceover: z.string(),       // spoken audio
  textOverlay: z.string(),     // on-screen text (may be empty)
});

const ReelScriptSchema = z.object({
  title: z.string(),
  hook: z.string(),
  duration: z.number().int().min(15).max(90),
  scenes: z.array(SceneSchema).min(3).max(12),
  musicMood: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()).min(1).max(15),
  cta: z.string(),
});

export type ReelScene = z.infer<typeof SceneSchema>;
export type ReelScript = z.infer<typeof ReelScriptSchema>;

export interface GenerateReelInput {
  pillar: Pillar;
  tone: Tone;
  platform: "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | "YOUTUBE_SHORTS";
  duration: 30 | 45 | 60;
  ctaStyle: string;
  topic?: string;
  variantCount?: number;
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

const PLATFORM_NOTES: Record<string, string> = {
  INSTAGRAM: "Instagram Reels — vertical 9:16, max 90s. Audience expects polished, aspirational, punchy.",
  TIKTOK: "TikTok — vertical 9:16. Raw authenticity wins. Trending audio encouraged. Hook must hit in 1–2 seconds.",
  FACEBOOK: "Facebook Reels — vertical 9:16. Mix of mobile-native and repurposed. Captions important (many watch muted).",
  YOUTUBE_SHORTS: "YouTube Shorts — vertical 9:16, max 60s. Viewer intent is higher. Slightly more storytelling room.",
};

// Scene count by duration: aim for ~6-8 second scenes
const SCENE_COUNTS: Record<number, number> = { 30: 5, 45: 6, 60: 8 };

function buildReelPrompt(input: GenerateReelInput): string {
  const sceneCount = SCENE_COUNTS[input.duration] ?? 6;

  return `${PLATFORM_NOTES[input.platform] ?? ""}

CONTENT PILLAR: ${PILLAR_CONTEXT[input.pillar]}
${TONE_CONTEXT[input.tone]}
REEL DURATION: ${input.duration} seconds (${sceneCount} scenes, ~${Math.round(input.duration / sceneCount)} seconds each)
CTA: ${CTA_STYLES[input.ctaStyle] ?? CTA_STYLES.none}
${input.topic ? `\nTOPIC / CONCEPT: ${input.topic}` : ""}

Generate a complete ${input.duration}-second reel script for "Swift the Great" with EXACTLY ${sceneCount} scenes.
The hook must grab attention in the first 2–3 seconds.
Each scene should have clear visual direction, a voiceover line, and optional on-screen text.

Return ONLY valid JSON — no markdown, no code fences:
{
  "title": "Short internal title for the reel",
  "hook": "The exact opening line / first-frame moment that grabs attention",
  "duration": ${input.duration},
  "scenes": [
    {
      "timestamp": "0:00–0:06",
      "visual": "Exactly what to film or show on screen",
      "voiceover": "Exactly what to say (can be empty string if silent/music-only)",
      "textOverlay": "Text that appears on screen (empty string if none)"
    }
  ],
  "musicMood": "Genre + BPM + energy level + 1–2 song/artist suggestions",
  "caption": "Full caption for posting (includes emojis, punchy, on-brand)",
  "hashtags": ["reels", "swiftera"],
  "cta": "End-of-reel call-to-action line"
}`;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseReelScript(text: string): ReelScript {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return ReelScriptSchema.parse(JSON.parse(cleaned));
}

async function withRetry<T>(fn: () => Promise<T>, max: number, delayMs: number): Promise<T> {
  for (let i = 1; i <= max; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === max) throw err;
      await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, i - 1)));
    }
  }
  throw new Error("all retries exhausted");
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateReelScript(input: GenerateReelInput): Promise<ReelScript> {
  const prompt = buildReelPrompt(input);
  log.info({ pillar: input.pillar, tone: input.tone, duration: input.duration, provider: config.aiProvider }, "Generating reel script");

  if (config.aiProvider === "gemini") {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: config.gemini.maxTokens,
      },
      systemInstruction: BRAND_SYSTEM_PROMPT,
    });

    return withRetry(
      async () => {
        const res = await model.generateContent(prompt);
        return parseReelScript(res.response.text());
      },
      config.gemini.maxRetries,
      config.gemini.retryDelayMs
    );
  }

  // OpenAI
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  return withRetry(
    async () => {
      const res = await client.chat.completions.create({
        model: config.openai.model,
        temperature: 0.9,
        max_tokens: config.openai.maxTokens,
        messages: [
          { role: "system", content: BRAND_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      });
      return parseReelScript(res.choices[0]?.message?.content ?? "");
    },
    config.openai.maxRetries,
    config.openai.retryDelayMs
  );
}
