import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, PostType, Pillar, Tone, Status } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as {
      items: Array<{
        platform?: string;
        postType?: string;
        pillar: string;
        tone: string;
        status?: string;
        caption: string;
        hashtags?: string[];
        topic?: string;
        linkUrl?: string;
      }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items to import" }, { status: 400 });
    }

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

    return NextResponse.json({ imported, total: items.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
