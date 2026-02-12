import OpenAI from "openai";
import { z } from "zod";
import { Pillar, Tone } from "@prisma/client";
import { BRAND_SYSTEM_PROMPT, buildGenerationPrompt } from "./prompts";
import { prisma } from "../prisma";

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
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Try to find a matching prompt template
  const template = await prisma.promptTemplate.findFirst({
    where: { pillar: input.pillar, tone: input.tone },
  });

  const userPrompt = buildGenerationPrompt({
    ...input,
    templateText: template?.templateText,
  });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: BRAND_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 4000,
  });

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
  if (settings?.blockedWords) {
    const blocked = settings.blockedWords
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);

    if (blocked.length > 0) {
      return validated.filter((v) => {
        const text = v.caption.toLowerCase();
        return !blocked.some((word) => text.includes(word));
      });
    }
  }

  return validated;
}
