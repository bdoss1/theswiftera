import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Pillar, Tone } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const template = await prisma.promptTemplate.update({
      where: { id },
      data: {
        name: body.name,
        pillar: body.pillar as Pillar,
        tone: body.tone as Tone,
        templateText: body.templateText,
      },
    });

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
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
