import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Pillar, Tone } from "@prisma/client";

export async function GET() {
  const templates = await prisma.promptTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, pillar, tone, templateText } = body;

    if (!name || !pillar || !tone || !templateText) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const template = await prisma.promptTemplate.create({
      data: {
        name,
        pillar: pillar as Pillar,
        tone: tone as Tone,
        templateText,
      },
    });

    return NextResponse.json({ template });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 500 }
    );
  }
}
