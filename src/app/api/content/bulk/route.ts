import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids, status } = body as { ids: string[]; status: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !status) {
      return NextResponse.json({ error: "ids and status required" }, { status: 400 });
    }

    const result = await prisma.contentItem.updateMany({
      where: { id: { in: ids } },
      data: { status: status as Status },
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bulk update failed" },
      { status: 500 }
    );
  }
}
