import OpenAI from "openai";
import { z } from "zod";
import { Pillar, Tone } from "@prisma/client";
import { BRAND_SYSTEM_PROMPT, buildGenerationPrompt } from "./prompts";
import { prisma } from "../prisma";
import { config } from "../config";
import { withRetry } from "./retry";
import { moderateContent } from "./moderation";
import { createChildLogger } from "../logger";

const log = createChildLogger("openai");

const VariantSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string(),
  hook: z.string().optional().default(""),
});

const VariantsArraySchema = z.array(VariantSchema);

export type ContentVariant = z.infer<typeof VariantSchema>;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
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
  const model = config.openai.model;

  // Try to find a matching prompt template
  const template = await prisma.promptTemplate.findFirst({
    where: { pillar: input.pillar, tone: input.tone },
  });

  const userPrompt = buildGenerationPrompt({
    ...input,
    templateText: template?.templateText,
  });

  // Call OpenAI with retry logic
  const response = await withRetry(
    () =>
      client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: BRAND_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
      }),
    "openai-generate"
  );

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");

  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  const validated = VariantsArraySchema.parse(parsed);

  // Apply blocked words filter
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

  // Apply OpenAI moderation check if strict mode is enabled
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

/**
 * Generate hashtag suggestions for a given caption using OpenAI.
 */
export async function generateHashtags(
  caption: string,
  pillar: string,
  count: number = 5
): Promise<string[]> {
  const client = getClient();
  const model = config.openai.model;

  const response = await withRetry(
    () =>
      client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a social media hashtag expert for the Swift the Great brand. Return ONLY a JSON array of hashtag strings (without the # symbol). No explanation.",
          },
          {
            role: "user",
            content: `Generate ${count} relevant hashtags for this ${pillar} content:\n\n"${caption}"\n\nReturn JSON array only.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    "openai-hashtags"
  );

  const content = response.choices[0]?.message?.content?.trim();
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
