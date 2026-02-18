import { NextRequest, NextResponse } from "next/server";
import { generateHashtags } from "@/lib/ai/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";
import { z } from "zod";

const log = createChildLogger("api:hashtags");

const HashtagRequestSchema = z.object({
  caption: z.string().min(1).max(5000),
  pillar: z.string().min(1),
  count: z.number().int().min(1).max(15).optional().default(5),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = HashtagRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { caption, pillar, count } = parsed.data;

    log.info({ pillar, count }, "Generating hashtags");
    const hashtags = await generateHashtags(caption, pillar, count);

    return NextResponse.json({ hashtags });
  } catch (err) {
    log.error({ err }, "Hashtag generation error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Hashtag generation failed" },
      { status: 500 }
    );
  }
}
