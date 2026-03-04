import { NextRequest, NextResponse } from "next/server";
import { fetchAllTrends } from "@/lib/trends";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limiter";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("api:trends");

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    log.info("Fetching trends");
    const { xTrends, redditTrends, errors } = await fetchAllTrends();
    log.info({ xCount: xTrends.length, redditCount: redditTrends.length }, "Trends fetched");

    return NextResponse.json({ xTrends, redditTrends, errors });
  } catch (err) {
    log.error({ err }, "Trends fetch error");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
