/**
 * AI provider abstraction.
 * Routes generation calls to OpenAI or Google Gemini based on AI_PROVIDER env var.
 */
import { config } from "../config";
import type { ContentVariant } from "./openai";

export type { ContentVariant };

type GenerateVariantsInput = Parameters<typeof import("./openai").generateVariants>[0];

export async function generateVariants(
  input: GenerateVariantsInput
): Promise<ContentVariant[]> {
  if (config.aiProvider === "gemini") {
    const { generateVariants: geminiGenerate } = await import("./gemini");
    return geminiGenerate(input);
  }
  const { generateVariants: openaiGenerate } = await import("./openai");
  return openaiGenerate(input);
}

export async function generateHashtags(
  caption: string,
  pillar: string,
  count: number = 5
): Promise<string[]> {
  if (config.aiProvider === "gemini") {
    const { generateHashtags: geminiHashtags } = await import("./gemini");
    return geminiHashtags(caption, pillar, count);
  }
  const { generateHashtags: openaiHashtags } = await import("./openai");
  return openaiHashtags(caption, pillar, count);
}
