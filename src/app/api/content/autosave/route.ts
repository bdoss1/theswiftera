import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";
import { z } from "zod";

const log = createChildLogger("api:autosave");

const AutosaveSchema = z.object({
  id: z.string().uuid(),
  caption: z.string().min(1).max(5000),
});

export async function PATCH(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = AutosaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, caption } = parsed.data;

    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only allow autosave for editable statuses
    if (!["DRAFT", "READY_FOR_REVIEW"].includes(item.status)) {
      return NextResponse.json(
        { error: "Can only autosave draft or review items" },
        { status: 400 }
      );
    }

    const updated = await prisma.contentItem.update({
      where: { id },
      data: { caption },
    });

    log.debug({ id }, "Content autosaved");
    return NextResponse.json({ item: updated });
  } catch (err) {
    log.error({ err }, "Autosave error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Autosave failed" },
      { status: 500 }
    );
  }
}
