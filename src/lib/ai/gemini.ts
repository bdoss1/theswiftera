import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { Pillar, Tone } from "@prisma/client";
import { BRAND_SYSTEM_PROMPT, buildGenerationPrompt } from "./prompts";
import { prisma } from "../prisma";
import { config } from "../config";
import { moderateContent } from "./moderation";
import { createChildLogger } from "../logger";

const log = createChildLogger("gemini");

const VariantSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string(),
  hook: z.string().optional().default(""),
});

const VariantsArraySchema = z.array(VariantSchema);

export type ContentVariant = z.infer<typeof VariantSchema>;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

async function withGeminiRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const { maxRetries, retryDelayMs } = config.gemini;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      if (isLastAttempt) {
        log.error({ attempt, label, error: errorMsg }, "All retries exhausted");
        throw err;
      }

      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      log.warn({ attempt, label, error: errorMsg, nextRetryMs: delay }, "Retrying after error");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${label}: All retries exhausted`);
}

export async function generateVariants(input: {
  pillar: Pillar;
  tone: Tone;
  postType: string;
  length: string;
  ctaStyle: string;
  topic?: string;
  variantCount: number;
}): Promise<ContentVariant[]> {
  const client = getClient();
  const model = config.gemini.model;

  const template = await prisma.promptTemplate.findFirst({
    where: { pillar: input.pillar, tone: input.tone },
  });

  const userPrompt = buildGenerationPrompt({
    ...input,
    templateText: template?.templateText,
  });

  const generativeModel = client.getGenerativeModel({
    model,
    generationConfig: {
      temperature: config.gemini.temperature,
      maxOutputTokens: config.gemini.maxTokens,
    },
    systemInstruction: BRAND_SYSTEM_PROMPT,
  });

  const response = await withGeminiRetry(
    () => generativeModel.generateContent(userPrompt),
    "gemini-generate"
  );

  const content = response.response.text().trim();
  if (!content) throw new Error("Empty response from Gemini");

  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  const validated = VariantsArraySchema.parse(parsed);

  const settings = await prisma.setting.findFirst();
  let filtered = validated;

  if (settings?.blockedWords) {
    const blocked = settings.blockedWords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);

    if (blocked.length > 0) {
      filtered = validated.filter((v) => {
        const text = v.caption.toLowerCase();
        return !blocked.some((word) => text.includes(word));
      });
    }
  }

  if (settings?.strictMode) {
    const moderatedResults: ContentVariant[] = [];
    for (const variant of filtered) {
      const modResult = await moderateContent(variant.caption);
      if (!modResult.flagged) {
        moderatedResults.push(variant);
      } else {
        log.warn(
          { categories: modResult.categories },
          "Variant filtered by moderation"
        );
      }
    }
    return moderatedResults;
  }

  return filtered;
}

export async function generateHashtags(
  caption: string,
  pillar: string,
  count: number = 5
): Promise<string[]> {
  const client = getClient();
  const model = config.gemini.model;

  const generativeModel = client.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 200,
    },
    systemInstruction:
      "You are a social media hashtag expert for the Swift the Great brand. Return ONLY a JSON array of hashtag strings (without the # symbol). No explanation.",
  });

  const response = await withGeminiRetry(
    () =>
      generativeModel.generateContent(
        `Generate ${count} relevant hashtags for this ${pillar} content:\n\n"${caption}"\n\nReturn JSON array only.`
      ),
    "gemini-hashtags"
  );

  const content = response.response.text().trim();
  if (!content) return [];

  try {
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const hashtags = JSON.parse(cleaned);
    return Array.isArray(hashtags)
      ? hashtags.map((h: string) => h.replace(/^#/, "")).slice(0, count)
      : [];
  } catch {
    return [];
  }
}
