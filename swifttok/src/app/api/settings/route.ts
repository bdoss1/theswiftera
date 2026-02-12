import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let settings = await prisma.setting.findFirst();
  if (!settings) {
    settings = await prisma.setting.create({ data: {} });
  }
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({ data: {} });
    }

    const updated = await prisma.setting.update({
      where: { id: settings.id },
      data: {
        requireApproval: body.requireApproval ?? settings.requireApproval,
        autoPostEnabled: body.autoPostEnabled ?? settings.autoPostEnabled,
        dailyPostTarget: body.dailyPostTarget ?? settings.dailyPostTarget,
        strictMode: body.strictMode ?? settings.strictMode,
        blockedWords: body.blockedWords ?? settings.blockedWords,
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (err) {
    console.error("Settings update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
