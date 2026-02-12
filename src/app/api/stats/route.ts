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

  return NextResponse.json({
    drafts,
    scheduledToday,
    postedToday,
    failed,
    totalPosts,
    approved,
  });
}
