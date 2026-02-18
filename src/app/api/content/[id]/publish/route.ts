import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { publishTextPost, publishLinkPost, publishImagePost } from "@/lib/facebook/publish";
import { publishToInstagram } from "@/lib/instagram/publish";
import { publishToX } from "@/lib/x/publish";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:publish");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const settings = await prisma.setting.findFirst();
    if (settings?.requireApproval && item.status !== Status.APPROVED && item.status !== Status.SCHEDULED) {
      return NextResponse.json({ error: "Item must be approved before publishing" }, { status: 400 });
    }

    const message = item.hashtags.length > 0
      ? `${item.caption}\n\n${item.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
      : item.caption;

    let externalPostId: string;

    if (item.platform === "INSTAGRAM") {
      externalPostId = await publishToInstagram(message, item.imageUrl);
    } else if (item.platform === "X") {
      externalPostId = await publishToX(message);
    } else {
      const fbPage = await prisma.facebookPage.findFirst();
      if (!fbPage) {
        return NextResponse.json({ error: "No Facebook page configured" }, { status: 400 });
      }

      if (item.postType === "IMAGE" && item.imageUrl) {
        externalPostId = await publishImagePost(fbPage.pageId, fbPage.pageAccessToken, message, item.imageUrl);
      } else if (item.postType === "LINK" && item.linkUrl) {
        externalPostId = await publishLinkPost(fbPage.pageId, fbPage.pageAccessToken, message, item.linkUrl);
      } else {
        externalPostId = await publishTextPost(fbPage.pageId, fbPage.pageAccessToken, message);
      }
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

    log.info({ id, platform: item.platform, externalPostId }, "Content published");
    return NextResponse.json({ item: updated });
  } catch (err) {
    log.error({ err }, "Publish error");
    const errorMsg = err instanceof Error ? err.message : "Publish failed";

    const { id } = await params;
    await prisma.contentItem.update({
      where: { id },
      data: { status: Status.FAILED, error: errorMsg },
    });

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
