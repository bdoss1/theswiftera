import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateVoiceover } from "@/lib/video/elevenlabs";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:reels:audio");

const RequestSchema = z.object({
  text: z.string().min(1).max(2000),
});

/** POST /api/reels/video/audio — generate a voiceover MP3, returns { audioUrl } */
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

    log.info({ textLength: parsed.data.text.length }, "Generating voiceover");
    const audioUrl = await generateVoiceover(parsed.data.text);
    return NextResponse.json({ audioUrl });
  } catch (err) {
    log.error({ err }, "Voiceover generation error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Voiceover generation failed" },
      { status: 500 }
    );
  }
}
