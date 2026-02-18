import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, PostType, Pillar, Tone, Status } from "@prisma/client";
import { ContentImportSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:content:import");

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = ContentImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items } = parsed.data;
    let imported = 0;

    for (const item of items) {
      try {
        await prisma.contentItem.create({
          data: {
            platform: (item.platform as Platform) || Platform.FACEBOOK,
            postType: (item.postType as PostType) || PostType.TEXT,
            pillar: item.pillar as Pillar,
            tone: item.tone as Tone,
            status: (item.status as Status) || Status.DRAFT,
            caption: item.caption,
            hashtags: item.hashtags || [],
            topic: item.topic || null,
            linkUrl: item.linkUrl || null,
          },
        });
        imported++;
      } catch {
        // Skip invalid items
      }
    }

    log.info({ imported, total: items.length }, "Content import completed");
    return NextResponse.json({ imported, total: items.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
