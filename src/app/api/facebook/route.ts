import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { testConnection } from "@/lib/facebook/publish";
import { FacebookConfigSchema } from "@/lib/validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:facebook");

export async function GET() {
  const page = await prisma.facebookPage.findFirst();
  if (!page) {
    return NextResponse.json({ page: null });
  }
  return NextResponse.json({
    page: {
      id: page.id,
      pageId: page.pageId,
      pageName: page.pageName,
      tokenSet: !!page.pageAccessToken,
      tokenExpiresAt: page.tokenExpiresAt,
    },
  });
}

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = await req.json();
    const parsed = FacebookConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pageId, pageAccessToken } = parsed.data;

    const page = await prisma.facebookPage.upsert({
      where: { pageId },
      create: { pageId, pageAccessToken },
      update: { pageAccessToken },
    });

    log.info({ pageId }, "Facebook page configured");
    return NextResponse.json({
      page: {
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        tokenSet: true,
      },
    });
  } catch (err) {
    log.error({ err }, "Facebook config error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }
}

export async function PUT() {
  try {
    const page = await prisma.facebookPage.findFirst();
    if (!page) {
      return NextResponse.json({ error: "No Facebook page configured" }, { status: 400 });
    }

    const result = await testConnection(page.pageId, page.pageAccessToken);
    if (result.success && result.pageName) {
      await prisma.facebookPage.update({
        where: { id: page.id },
        data: { pageName: result.pageName },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Test failed" },
      { status: 500 }
    );
  }
}
