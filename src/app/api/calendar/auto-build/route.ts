import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

const DEFAULT_TIMES = [
  "09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30", "21:00",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, targetCount } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const count = Math.min(Math.max(1, targetCount || 8), DEFAULT_TIMES.length);
    const times = DEFAULT_TIMES.slice(0, count);

    // Get approved items without a schedule
    const available = await prisma.contentItem.findMany({
      where: {
        status: { in: [Status.APPROVED] },
        scheduledFor: null,
      },
      orderBy: { createdAt: "asc" },
      take: count,
    });

    if (available.length === 0) {
      return NextResponse.json({ error: "No approved items available to schedule" }, { status: 400 });
    }

    const scheduled = [];
    for (let i = 0; i < Math.min(available.length, times.length); i++) {
      const [hours, minutes] = times[i].split(":").map(Number);
      const runAt = new Date(date);
      runAt.setHours(hours, minutes, 0, 0);

      const updated = await prisma.contentItem.update({
        where: { id: available[i].id },
        data: { status: Status.SCHEDULED, scheduledFor: runAt },
      });

      await prisma.publishJob.upsert({
        where: { contentItemId: available[i].id },
        create: {
          contentItemId: available[i].id,
          runAt,
          status: "SCHEDULED",
        },
        update: {
          runAt,
          status: "SCHEDULED",
          attempts: 0,
          lastError: null,
        },
      });

      scheduled.push(updated);
    }

    return NextResponse.json({
      scheduled,
      message: `Scheduled ${scheduled.length} items for ${date}`,
    });
  } catch (err) {
    console.error("Auto-build error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auto-build failed" },
      { status: 500 }
    );
  }
}
