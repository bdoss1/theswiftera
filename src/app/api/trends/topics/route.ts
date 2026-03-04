import { NextRequest, NextResponse } from "next/server";
import { generateTrendTopics } from "@/lib/ai/trends";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";
import { z } from "zod";

const log = createChildLogger("api:trends:topics");

const RequestSchema = z.object({
  trendName: z.string().min(1).max(300),
  pillarHint: z.string().optional(),
  subreddit: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { trendName, pillarHint, subreddit } = parsed.data;
    log.info({ trendName }, "Generating topics for trend");

    const topics = await generateTrendTopics(trendName, pillarHint, subreddit);
    return NextResponse.json({ topics });
  } catch (err) {
    log.error({ err }, "Trend topic generation error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Topic generation failed" },
      { status: 500 }
    );
  }
}
