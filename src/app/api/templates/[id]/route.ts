import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TemplateUpdateSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:templates:[id]");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = TemplateUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const template = await prisma.promptTemplate.update({
      where: { id },
      data: parsed.data,
    });

    log.info({ id }, "Template updated");
    return NextResponse.json({ template });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.promptTemplate.delete({ where: { id } });
    log.info({ id }, "Template deleted");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
