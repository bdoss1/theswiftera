import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status, Platform, PostType } from "@prisma/client";
import { ContentCreateSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:content");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as Status | null;
  const pillar = searchParams.get("pillar");
  const tone = searchParams.get("tone");
  const date = searchParams.get("date");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (pillar) where.pillar = pillar;
  if (tone) where.tone = tone;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.scheduledFor = { gte: start, lt: end };
  }

  const items = await prisma.contentItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { publishJob: true },
    take: 200,
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = ContentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { items } = parsed.data;

    const settings = await prisma.setting.findFirst();
    const autoApprove = settings?.autoPostEnabled && !settings?.strictMode;

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.contentItem.create({
          data: {
            platform: (item.platform as Platform) || Platform.FACEBOOK,
            postType: (item.postType as PostType) || PostType.TEXT,
            pillar: item.pillar,
            tone: item.tone,
            status: autoApprove ? Status.APPROVED : Status.DRAFT,
            topic: item.topic || null,
            caption: item.caption,
            hashtags: item.hashtags || [],
            linkUrl: item.linkUrl || null,
            imageUrl: item.imageUrl || null,
          },
        })
      )
    );

    log.info({ count: created.length }, "Content items created");
    return NextResponse.json({ items: created });
  } catch (err) {
    log.error({ err }, "Content create error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create content" },
      { status: 500 }
    );
  }
}
