import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startClipGeneration, pollClipGeneration } from "@/lib/video/luma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:reels:clip");

const StartSchema = z.object({
  visual: z.string().min(1).max(1000),
  /** Optional extra context appended to the visual prompt */
  context: z.string().max(300).optional(),
});

/** POST /api/reels/video/clip — submit a new clip generation, returns { generationId } */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = StartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { visual, context } = parsed.data;
    const prompt = context ? `${visual}. Style: ${context}` : visual;

    log.info({ promptLength: prompt.length }, "Submitting Luma clip generation");
    const generationId = await startClipGeneration(prompt, "9:16");
    return NextResponse.json({ generationId });
  } catch (err) {
    log.error({ err }, "Clip generation submit error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Clip generation failed" },
      { status: 500 }
    );
  }
}

/** GET /api/reels/video/clip?id=xxx — poll status of a generation */
export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  try {
    const result = await pollClipGeneration(id);
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err, id }, "Clip poll error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Poll failed" },
      { status: 500 }
    );
  }
}
