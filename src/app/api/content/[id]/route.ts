import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";
import { ContentUpdateSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:content:[id]");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ContentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, caption, scheduledFor, linkUrl } = parsed.data;

    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (caption !== undefined) data.caption = caption;
    if (linkUrl !== undefined) data.linkUrl = linkUrl;
    if (status !== undefined) data.status = status as Status;

    if (scheduledFor !== undefined) {
      data.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
      if (scheduledFor && status !== Status.SCHEDULED) {
        data.status = Status.SCHEDULED;
      }
    }

    const updated = await prisma.contentItem.update({ where: { id }, data });

    if (updated.status === Status.SCHEDULED && updated.scheduledFor) {
      await prisma.publishJob.upsert({
        where: { contentItemId: id },
        create: {
          contentItemId: id,
          runAt: updated.scheduledFor,
          status: "SCHEDULED",
        },
        update: {
          runAt: updated.scheduledFor,
          status: "SCHEDULED",
          attempts: 0,
          lastError: null,
        },
      });
    }

    log.info({ id, status: updated.status }, "Content item updated");
    return NextResponse.json({ item: updated });
  } catch (err) {
    log.error({ err }, "Content update error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    await prisma.contentItem.delete({ where: { id } });
    log.info({ id }, "Content item deleted");
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error({ err }, "Content delete error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
