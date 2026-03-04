import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateStrategy } from "@/lib/ai/strategy";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";
import { Status } from "@prisma/client";

const log = createChildLogger("api:strategy");

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const [
      statusGroups,
      pillarGroups,
      toneGroups,
      platformGroups,
      recentPosted,
      settings,
    ] = await Promise.all([
      prisma.contentItem.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.contentItem.groupBy({ by: ["pillar"], _count: { id: true } }),
      prisma.contentItem.groupBy({ by: ["tone"], _count: { id: true } }),
      prisma.contentItem.groupBy({ by: ["platform"], _count: { id: true } }),
      prisma.contentItem.findMany({
        where: { status: Status.POSTED, postedAt: { gte: fourteenDaysAgo } },
        select: { pillar: true, postedAt: true },
      }),
      prisma.setting.findFirst(),
    ]);

    // Build lookup maps
    const statusMap: Record<string, number> = {};
    for (const g of statusGroups) statusMap[g.status] = g._count.id;

    const pillarCounts: Record<string, number> = {};
    for (const g of pillarGroups) pillarCounts[g.pillar] = g._count.id;

    const toneCounts: Record<string, number> = {};
    for (const g of toneGroups) toneCounts[g.tone] = g._count.id;

    const platformCounts: Record<string, number> = {};
    for (const g of platformGroups) platformCounts[g.platform] = g._count.id;

    const recentPostedByPillar: Record<string, number> = {};
    for (const item of recentPosted) {
      recentPostedByPillar[item.pillar] = (recentPostedByPillar[item.pillar] ?? 0) + 1;
    }

    const totalPostedRecent = recentPosted.length;
    const avgPostsPerDay = totalPostedRecent / 14;

    const total =
      (statusMap[Status.DRAFT] ?? 0) +
      (statusMap[Status.READY_FOR_REVIEW] ?? 0) +
      (statusMap[Status.APPROVED] ?? 0) +
      (statusMap[Status.SCHEDULED] ?? 0) +
      (statusMap[Status.POSTED] ?? 0) +
      (statusMap[Status.FAILED] ?? 0);

    const statsData = {
      total,
      drafts: (statusMap[Status.DRAFT] ?? 0) + (statusMap[Status.READY_FOR_REVIEW] ?? 0),
      approved: statusMap[Status.APPROVED] ?? 0,
      scheduled: statusMap[Status.SCHEDULED] ?? 0,
      posted: statusMap[Status.POSTED] ?? 0,
      failed: statusMap[Status.FAILED] ?? 0,
      avgPostsPerDay,
      dailyTarget: settings?.dailyPostTarget ?? 3,
      pillarCounts,
      toneCounts,
      platformCounts,
      recentPostedByPillar,
    };

    log.info({ total, avgPostsPerDay }, "Generating content strategy");

    const report = await generateStrategy(statsData);

    return NextResponse.json({ report, generatedAt: new Date().toISOString() });
  } catch (err) {
    log.error({ err }, "Strategy generation error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Strategy generation failed" },
      { status: 500 }
    );
  }
}
