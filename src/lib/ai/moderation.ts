import OpenAI from "openai";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("moderation");

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

/**
 * Check content against OpenAI's moderation API.
 * Returns whether the content is flagged and which categories triggered.
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    const client = getClient();
    const response = await client.moderations.create({
      input: text,
    });

    const result = response.results[0];
    if (!result) {
      return { flagged: false, categories: [] };
    }

    const flaggedCategories: string[] = [];
    const categories = result.categories as unknown as Record<string, boolean>;
    for (const [category, flagged] of Object.entries(categories)) {
      if (flagged) {
        flaggedCategories.push(category);
      }
    }

    if (result.flagged) {
      log.warn({ categories: flaggedCategories }, "Content flagged by moderation");
    }

    return {
      flagged: result.flagged,
      categories: flaggedCategories,
    };
  } catch (err) {
    log.error({ err }, "Moderation API error — allowing content through");
    // Fail open: if moderation API is down, don't block content
    return { flagged: false, categories: [] };
  }
}
