import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [drafts, scheduledToday, postedToday, failed] = await Promise.all([
    prisma.contentItem.count({ where: { status: { in: [Status.DRAFT, Status.READY_FOR_REVIEW] } } }),
    prisma.contentItem.count({
      where: { status: Status.SCHEDULED, scheduledFor: { gte: today, lt: tomorrow } },
    }),
    prisma.contentItem.count({
      where: { status: Status.POSTED, postedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.contentItem.count({ where: { status: Status.FAILED } }),
  ]);

  const totalPosts = await prisma.contentItem.count();
  const approved = await prisma.contentItem.count({ where: { status: Status.APPROVED } });

  const chartDays = 14;
  const chartStart = new Date(today);
  chartStart.setDate(chartStart.getDate() - chartDays + 1);

  const postedItems = await prisma.contentItem.findMany({
    where: { status: Status.POSTED, postedAt: { gte: chartStart } },
    select: { postedAt: true },
  });

  const createdItems = await prisma.contentItem.findMany({
    where: { createdAt: { gte: chartStart } },
    select: { createdAt: true },
  });

  const dailyData: Array<{ date: string; posted: number; created: number }> = [];
  for (let i = 0; i < chartDays; i++) {
    const d = new Date(chartStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const posted = postedItems.filter((item) => {
      const t = item.postedAt!.getTime();
      return t >= d.getTime() && t < nextD.getTime();
    }).length;

    const created = createdItems.filter((item) => {
      const t = item.createdAt.getTime();
      return t >= d.getTime() && t < nextD.getTime();
    }).length;

    dailyData.push({ date: dateStr, posted, created });
  }

  const pillarCounts = await prisma.contentItem.groupBy({
    by: ["pillar"],
    _count: { id: true },
  });

  const pillarData = pillarCounts.map((p) => ({
    pillar: p.pillar,
    count: p._count.id,
  }));

  return NextResponse.json({
    drafts,
    scheduledToday,
    postedToday,
    failed,
    totalPosts,
    approved,
    dailyData,
    pillarData,
  });
}
