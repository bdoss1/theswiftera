import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { generateImage, createImageVariation } from "@/lib/ai/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";
import { z } from "zod";

const log = createChildLogger("api:images:generate");

const ImageGenerateSchema = z.object({
  mode: z.enum(["generate", "variation"]),
  prompt: z.string().min(1).max(1000).optional(),
  referenceImageUrl: z.string().optional(),
  size: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = ImageGenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { mode, prompt, referenceImageUrl, size } = parsed.data;

    if (mode === "generate") {
      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required for image generation" }, { status: 400 });
      }

      log.info({ prompt: prompt.slice(0, 100) }, "Generating image from prompt");

      const result = await generateImage({
        prompt,
        size: (size as "1024x1024" | "1024x1792" | "1792x1024") || "1024x1024",
      });

      return NextResponse.json(result);
    }

    if (mode === "variation") {
      if (!referenceImageUrl) {
        return NextResponse.json({ error: "Reference image URL is required for variations" }, { status: 400 });
      }

      // Read the uploaded file from disk
      const filePath = path.join(process.cwd(), "public", referenceImageUrl);
      const imageBuffer = await readFile(filePath);
      const filename = path.basename(referenceImageUrl);

      log.info({ filename }, "Creating image variation");

      const result = await createImageVariation({
        imageBuffer,
        filename,
        size: (size as "256x256" | "512x512" | "1024x1024") || "1024x1024",
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (err) {
    log.error({ err }, "Image generation error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed" },
      { status: 500 }
    );
  }
}
