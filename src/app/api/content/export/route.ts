import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const items = await prisma.contentItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (format === "csv") {
    const headers = [
      "id", "platform", "postType", "pillar", "tone", "status",
      "caption", "hashtags", "topic", "linkUrl", "scheduledFor",
      "postedAt", "externalPostId", "error", "createdAt",
    ];

    const csvRows = [headers.join(",")];
    for (const item of items) {
      const row = [
        item.id,
        item.platform,
        item.postType,
        item.pillar,
        item.tone,
        item.status,
        `"${item.caption.replace(/"/g, '""')}"`,
        `"${item.hashtags.join(", ")}"`,
        item.topic ? `"${item.topic.replace(/"/g, '""')}"` : "",
        item.linkUrl || "",
        item.scheduledFor?.toISOString() || "",
        item.postedAt?.toISOString() || "",
        item.externalPostId || "",
        item.error ? `"${item.error.replace(/"/g, '""')}"` : "",
        item.createdAt.toISOString(),
      ];
      csvRows.push(row.join(","));
    }

    return new NextResponse(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=swifttok-export-${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  }

  return NextResponse.json({ items, exportedAt: new Date().toISOString() });
}
