import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { testConnection } from "@/lib/facebook/publish";

export async function GET() {
  const page = await prisma.facebookPage.findFirst();
  if (!page) {
    return NextResponse.json({ page: null });
  }
  // Don't expose full token
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
  try {
    const body = await req.json();
    const { pageId, pageAccessToken } = body;

    if (!pageId || !pageAccessToken) {
      return NextResponse.json({ error: "pageId and pageAccessToken required" }, { status: 400 });
    }

    const page = await prisma.facebookPage.upsert({
      where: { pageId },
      create: { pageId, pageAccessToken },
      update: { pageAccessToken },
    });

    return NextResponse.json({
      page: {
        id: page.id,
        pageId: page.pageId,
        pageName: page.pageName,
        tokenSet: true,
      },
    });
  } catch (err) {
    console.error("Facebook config error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  // Test connection
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
