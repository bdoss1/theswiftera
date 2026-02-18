import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { BulkUpdateSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:content:bulk");

export async function PATCH(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = BulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { ids, status } = parsed.data;

    const result = await prisma.contentItem.updateMany({
      where: { id: { in: ids } },
      data: { status: status as Status },
    });

    log.info({ count: result.count, status }, "Bulk update completed");
    return NextResponse.json({ updated: result.count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bulk update failed" },
      { status: 500 }
    );
  }
}
