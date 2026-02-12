import { NextRequest, NextResponse } from "next/server";
import { generateVariants } from "@/lib/ai/openai";
import { Pillar, Tone } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pillar, tone, postType, length, ctaStyle, topic, variantCount } = body;

    if (!pillar || !tone || !postType || !length || !variantCount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const variants = await generateVariants({
      pillar: pillar as Pillar,
      tone: tone as Tone,
      postType,
      length,
      ctaStyle: ctaStyle || "none",
      topic: topic || undefined,
      variantCount: Math.min(Math.max(1, variantCount), 10),
    });

    return NextResponse.json({ variants });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
