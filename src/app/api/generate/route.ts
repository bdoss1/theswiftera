import { NextRequest, NextResponse } from "next/server";
import { generateVariants } from "@/lib/ai/openai";
import { GenerateSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:generate");

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = GenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pillar, tone, postType, length, ctaStyle, topic, variantCount } = parsed.data;

    log.info({ pillar, tone, variantCount }, "Generating content variants");

    const variants = await generateVariants({
      pillar,
      tone,
      postType,
      length,
      ctaStyle: ctaStyle || "none",
      topic: topic || undefined,
      variantCount: Math.min(Math.max(1, variantCount), 10),
    });

    log.info({ count: variants.length }, "Content variants generated");
    return NextResponse.json({ variants });
  } catch (err) {
    log.error({ err }, "Generate error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
