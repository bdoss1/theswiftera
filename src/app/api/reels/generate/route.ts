import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateReelScript } from "@/lib/ai/reels";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:reels:generate");

const RequestSchema = z.object({
  pillar: z.enum(["BROTHERHOOD", "LEADERSHIP", "HUMOR", "ENTREPRENEURSHIP", "FAMILY"]),
  tone: z.enum(["LEADER", "FUNNY", "REFLECTIVE", "BUILDER", "CLUBHOUSE"]),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "FACEBOOK", "YOUTUBE_SHORTS"]).default("INSTAGRAM"),
  duration: z.union([z.literal(30), z.literal(45), z.literal(60)]).default(30),
  ctaStyle: z.string().default("none"),
  topic: z.string().max(500).optional(),
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

    log.info({ pillar: parsed.data.pillar, duration: parsed.data.duration }, "Generating reel script");

    const script = await generateReelScript(parsed.data);
    return NextResponse.json({ script });
  } catch (err) {
    log.error({ err }, "Reel generation error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reel generation failed" },
      { status: 500 }
    );
  }
}
