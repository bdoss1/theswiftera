import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Pillar, Tone, PostType, Status, Platform } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as Status | null;
  const pillar = searchParams.get("pillar") as Pillar | null;
  const tone = searchParams.get("tone") as Tone | null;
  const date = searchParams.get("date"); // YYYY-MM-DD

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
  try {
    const body = await req.json();
    const { items } = body as {
      items: Array<{
        pillar: Pillar;
        tone: Tone;
        postType: PostType;
        caption: string;
        hashtags?: string[];
        topic?: string;
        linkUrl?: string;
      }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Check auto-post settings
    const settings = await prisma.setting.findFirst();
    const autoApprove = settings?.autoPostEnabled && !settings?.strictMode;

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.contentItem.create({
          data: {
            platform: Platform.FACEBOOK,
            postType: item.postType || PostType.TEXT,
            pillar: item.pillar,
            tone: item.tone,
            status: autoApprove ? Status.APPROVED : Status.DRAFT,
            topic: item.topic || null,
            caption: item.caption,
            hashtags: item.hashtags || [],
            linkUrl: item.linkUrl || null,
          },
        })
      )
    );

    return NextResponse.json({ items: created });
  } catch (err) {
    console.error("Content create error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create content" },
      { status: 500 }
    );
  }
}
