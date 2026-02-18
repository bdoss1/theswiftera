import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import { config } from "@/lib/config";

export async function GET() {
  const limits = await prisma.rateLimit.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ limits });
}

export async function POST() {
  try {
    const now = new Date();

    const limit = await prisma.rateLimit.upsert({
      where: {
        platform_endpoint: {
          platform: Platform.FACEBOOK,
          endpoint: "feed",
        },
      },
      create: {
        platform: Platform.FACEBOOK,
        endpoint: "feed",
        callCount: 1,
        windowStart: now,
        windowMinutes: config.rateLimit.windowMinutes,
        limitPerWindow: config.rateLimit.perWindow,
        lastCallAt: now,
      },
      update: {
        callCount: { increment: 1 },
        lastCallAt: now,
      },
    });

    const windowEnd = new Date(limit.windowStart.getTime() + limit.windowMinutes * 60 * 1000);
    if (now > windowEnd) {
      await prisma.rateLimit.update({
        where: { id: limit.id },
        data: {
          callCount: 1,
          windowStart: now,
        },
      });
    }

    const remaining = Math.max(0, limit.limitPerWindow - limit.callCount);
    return NextResponse.json({
      callCount: limit.callCount,
      limitPerWindow: limit.limitPerWindow,
      remaining,
      windowResets: windowEnd.toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rate limit tracking failed" },
      { status: 500 }
    );
  }
}
