import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { publishTextPost, publishLinkPost } from "@/lib/facebook/publish";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check approval
    const settings = await prisma.setting.findFirst();
    if (settings?.requireApproval && item.status !== Status.APPROVED && item.status !== Status.SCHEDULED) {
      return NextResponse.json({ error: "Item must be approved before publishing" }, { status: 400 });
    }

    // Get Facebook page config
    const fbPage = await prisma.facebookPage.findFirst();
    if (!fbPage) {
      return NextResponse.json({ error: "No Facebook page configured" }, { status: 400 });
    }

    const message = item.hashtags.length > 0
      ? `${item.caption}\n\n${item.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
      : item.caption;

    let externalPostId: string;
    if (item.postType === "LINK" && item.linkUrl) {
      externalPostId = await publishLinkPost(fbPage.pageId, fbPage.pageAccessToken, message, item.linkUrl);
    } else {
      externalPostId = await publishTextPost(fbPage.pageId, fbPage.pageAccessToken, message);
    }

    const updated = await prisma.contentItem.update({
      where: { id },
      data: {
        status: Status.POSTED,
        postedAt: new Date(),
        externalPostId,
        error: null,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("Publish error:", err);
    const errorMsg = err instanceof Error ? err.message : "Publish failed";

    const { id } = await params;
    await prisma.contentItem.update({
      where: { id },
      data: { status: Status.FAILED, error: errorMsg },
    });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
