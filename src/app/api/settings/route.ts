import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SettingsUpdateSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:settings");

export async function GET() {
  let settings = await prisma.setting.findFirst();
  if (!settings) {
    settings = await prisma.setting.create({ data: {} });
  }
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = SettingsUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({ data: {} });
    }

    const updated = await prisma.setting.update({
      where: { id: settings.id },
      data: {
        requireApproval: parsed.data.requireApproval ?? settings.requireApproval,
        autoPostEnabled: parsed.data.autoPostEnabled ?? settings.autoPostEnabled,
        dailyPostTarget: parsed.data.dailyPostTarget ?? settings.dailyPostTarget,
        strictMode: parsed.data.strictMode ?? settings.strictMode,
        blockedWords: parsed.data.blockedWords ?? settings.blockedWords,
      },
    });

    log.info("Settings updated");
    return NextResponse.json({ settings: updated });
  } catch (err) {
    log.error({ err }, "Settings update error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
