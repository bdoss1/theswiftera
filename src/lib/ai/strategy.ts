import { z } from "zod";
import { config } from "@/lib/config";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("ai:strategy");

export interface ContentStats {
  total: number;
  drafts: number;
  approved: number;
  scheduled: number;
  posted: number;
  failed: number;
  avgPostsPerDay: number;
  dailyTarget: number;
  pillarCounts: Record<string, number>;
  toneCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  recentPostedByPillar: Record<string, number>;
}

const TopicIdeaSchema = z.object({
  topic: z.string(),
  pillar: z.string(),
  tone: z.string(),
  angle: z.string(),
});

export const StrategyReportSchema = z.object({
  summary: z.string(),
  contentMix: z.object({
    analysis: z.string(),
    recommendations: z.array(z.string()),
  }),
  postingCadence: z.object({
    analysis: z.string(),
    recommendations: z.array(z.string()),
  }),
  contentGaps: z.array(z.string()),
  weeklyFocus: z.object({
    pillar: z.string(),
    tone: z.string(),
    reasoning: z.string(),
  }),
  topicIdeas: z.array(TopicIdeaSchema),
  actionItems: z.array(z.string()),
});

export type StrategyReport = z.infer<typeof StrategyReportSchema>;

const STRATEGY_SYSTEM_PROMPT = `You are the strategic content advisor for "Swift the Great" — The Swift Era brand.

BRAND PILLARS: BROTHERHOOD, LEADERSHIP, HUMOR, ENTREPRENEURSHIP, FAMILY
BRAND TONES: LEADER, FUNNY, REFLECTIVE, BUILDER, CLUBHOUSE

Your job is to analyze real content performance data and return actionable, specific strategic advice.
Be direct and brand-authentic — think like a seasoned social media strategist who rides motorcycles and builds businesses.

OUTPUT: Return ONLY valid JSON. No markdown, no code fences, no explanation outside the JSON object.`;

function buildStrategyPrompt(data: ContentStats): string {
  const pct = (n: number) => (data.total > 0 ? `${Math.round((n / data.total) * 100)}%` : "0%");
  const pillars = Object.entries(data.pillarCounts)
    .map(([k, v]) => `  ${k}: ${v} (${pct(v)})`)
    .join("\n");
  const tones = Object.entries(data.toneCounts)
    .map(([k, v]) => `  ${k}: ${v} (${pct(v)})`)
    .join("\n");
  const platforms = Object.entries(data.platformCounts)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");
  const recentPillars = Object.entries(data.recentPostedByPillar)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  return `Analyze this content engine data for "Swift the Great" and generate a strategic plan:

CONTENT INVENTORY:
- Total items: ${data.total}
- Drafts / In Review: ${data.drafts}
- Approved (ready to schedule): ${data.approved}
- Scheduled: ${data.scheduled}
- Posted: ${data.posted}
- Failed: ${data.failed}

POSTING PERFORMANCE:
- Average posts per day (last 14 days): ${data.avgPostsPerDay.toFixed(1)}
- Daily post target: ${data.dailyTarget}
- Performance vs target: ${data.dailyTarget > 0 ? `${Math.round((data.avgPostsPerDay / data.dailyTarget) * 100)}%` : "no target set"}

PILLAR DISTRIBUTION (all content):
${pillars || "  No data yet"}

TONE DISTRIBUTION (all content):
${tones || "  No data yet"}

PLATFORM DISTRIBUTION:
${platforms || "  No data yet"}

RECENTLY POSTED PILLARS (last 14 days):
${recentPillars || "  No posts yet"}

Return a JSON object with this exact structure:
{
  "summary": "2-3 sentence strategic overview of current state and main opportunity",
  "contentMix": {
    "analysis": "2-3 sentence analysis of pillar and tone balance",
    "recommendations": ["specific recommendation", "specific recommendation", "specific recommendation"]
  },
  "postingCadence": {
    "analysis": "2-3 sentence analysis of posting frequency and consistency",
    "recommendations": ["specific recommendation", "specific recommendation"]
  },
  "contentGaps": ["gap description", "gap description", "gap description"],
  "weeklyFocus": {
    "pillar": "ONE_PILLAR_NAME",
    "tone": "ONE_TONE_NAME",
    "reasoning": "1-2 sentence explanation of why this combo this week"
  },
  "topicIdeas": [
    {
      "topic": "Specific topic title",
      "pillar": "PILLAR_NAME",
      "tone": "TONE_NAME",
      "angle": "Brief description of the angle or hook to use"
    }
  ],
  "actionItems": ["concrete action", "concrete action", "concrete action", "concrete action", "concrete action"]
}

topicIdeas should include exactly 5 ideas. actionItems should include exactly 5 items.`;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxRetries: number, retryDelayMs: number): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      log.warn({ attempt, label, nextRetryMs: delay }, "Retrying strategy generation");
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`${label}: all retries exhausted`);
}

function parseStrategyResponse(text: string): StrategyReport {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  return StrategyReportSchema.parse(parsed);
}

async function generateWithOpenAI(prompt: string): Promise<StrategyReport> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { maxRetries, retryDelayMs, temperature, maxTokens, model } = config.openai;

  return withRetry(
    async () => {
      const res = await client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: STRATEGY_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      });
      const text = res.choices[0]?.message?.content ?? "";
      return parseStrategyResponse(text);
    },
    "openai-strategy",
    maxRetries,
    retryDelayMs
  );
}

async function generateWithGemini(prompt: string): Promise<StrategyReport> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const client = new GoogleGenerativeAI(apiKey);
  const { maxRetries, retryDelayMs, temperature, maxTokens, model } = config.gemini;

  const generativeModel = client.getGenerativeModel({
    model,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
    systemInstruction: STRATEGY_SYSTEM_PROMPT,
  });

  return withRetry(
    async () => {
      const res = await generativeModel.generateContent(prompt);
      const text = res.response.text().trim();
      return parseStrategyResponse(text);
    },
    "gemini-strategy",
    maxRetries,
    retryDelayMs
  );
}

export async function generateStrategy(data: ContentStats): Promise<StrategyReport> {
  const prompt = buildStrategyPrompt(data);

  log.info({ provider: config.aiProvider }, "Generating content strategy");

  if (config.aiProvider === "gemini") {
    return generateWithGemini(prompt);
  }
  return generateWithOpenAI(prompt);
}
