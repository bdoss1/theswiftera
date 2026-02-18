import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { AutoBuildSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";
import { config } from "@/lib/config";

const log = createChildLogger("api:auto-build");

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = AutoBuildSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, targetCount } = parsed.data;
    const times = config.content.defaultScheduleTimes;
    const count = Math.min(Math.max(1, targetCount || 8), times.length);
    const selectedTimes = times.slice(0, count);

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
    for (let i = 0; i < Math.min(available.length, selectedTimes.length); i++) {
      const [hours, minutes] = selectedTimes[i].split(":").map(Number);
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

    log.info({ date, count: scheduled.length }, "Auto-build completed");
    return NextResponse.json({
      scheduled,
      message: `Scheduled ${scheduled.length} items for ${date}`,
    });
  } catch (err) {
    log.error({ err }, "Auto-build error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auto-build failed" },
      { status: 500 }
    );
  }
}
