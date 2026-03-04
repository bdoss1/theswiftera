import { z } from "zod";
import { config } from "@/lib/config";
import { createChildLogger } from "@/lib/logger";
import { BRAND_SYSTEM_PROMPT } from "./prompts";

const log = createChildLogger("ai:trends");

const TrendTopicSchema = z.object({
  topic: z.string(),
  pillar: z.enum(["BROTHERHOOD", "LEADERSHIP", "HUMOR", "ENTREPRENEURSHIP", "FAMILY"]),
  tone: z.enum(["LEADER", "FUNNY", "REFLECTIVE", "BUILDER", "CLUBHOUSE"]),
  angle: z.string(),
});

const TrendTopicsArraySchema = z.array(TrendTopicSchema).min(1).max(10);

export type TrendTopic = z.infer<typeof TrendTopicSchema>;

function buildTrendPrompt(trendName: string, pillarHint?: string, subreddit?: string): string {
  const context = [
    subreddit ? `Source: r/${subreddit}` : null,
    pillarHint ? `Suggested brand pillar: ${pillarHint}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `A trend or topic is currently popular: "${trendName}"${context ? `\n(${context})` : ""}

Generate 5 content topic ideas for "Swift the Great" that connect this trend to the brand.
Each idea should map the trend to a brand pillar (BROTHERHOOD, LEADERSHIP, HUMOR, ENTREPRENEURSHIP, FAMILY)
and a tone (LEADER, FUNNY, REFLECTIVE, BUILDER, CLUBHOUSE). Be creative but stay authentic to the brand.

Return ONLY a JSON array — no explanation, no markdown:
[
  {
    "topic": "Specific, punchy post topic title",
    "pillar": "PILLAR_NAME",
    "tone": "TONE_NAME",
    "angle": "1-2 sentences describing the hook, angle, or perspective to take"
  }
]`;
}

function parseTopics(text: string): TrendTopic[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return TrendTopicsArraySchema.parse(JSON.parse(cleaned));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  retryDelayMs: number
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("all retries exhausted");
}

export async function generateTrendTopics(
  trendName: string,
  pillarHint?: string,
  subreddit?: string
): Promise<TrendTopic[]> {
  const prompt = buildTrendPrompt(trendName, pillarHint, subreddit);
  log.info({ trendName, provider: config.aiProvider }, "Generating trend topics");

  if (config.aiProvider === "gemini") {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: { temperature: 0.9, maxOutputTokens: 1000 },
      systemInstruction: BRAND_SYSTEM_PROMPT,
    });

    return withRetry(
      async () => {
        const res = await model.generateContent(prompt);
        return parseTopics(res.response.text());
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
        max_tokens: 1000,
        messages: [
          { role: "system", content: BRAND_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      });
      return parseTopics(res.choices[0]?.message?.content ?? "");
    },
    config.openai.maxRetries,
    config.openai.retryDelayMs
  );
}
