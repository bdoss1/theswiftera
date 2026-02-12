import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, caption, scheduledFor, linkUrl } = body;

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

    // If scheduling, create or update PublishJob
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

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("Content update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.contentItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Content delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
