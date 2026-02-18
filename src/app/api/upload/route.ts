import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { config } from "@/lib/config";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:upload");

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!(config.upload.allowedTypes as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${config.upload.allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    const maxBytes = config.upload.maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Maximum: ${config.upload.maxFileSizeMb}MB` },
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), config.upload.uploadDir);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const imageUrl = `/uploads/${filename}`;
    log.info({ filename, size: file.size }, "Image uploaded");

    return NextResponse.json({ imageUrl, filename });
  } catch (err) {
    log.error({ err }, "Upload error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
