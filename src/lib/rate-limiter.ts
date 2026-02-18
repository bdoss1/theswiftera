import { NextRequest, NextResponse } from "next/server";
import { config } from "./config";

/**
 * Simple in-memory rate limiter for API endpoints.
 * Tracks request counts per IP address within a sliding window.
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(req: NextRequest): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const ip = getClientIp(req);
  const limit = config.rateLimit.apiRequestsPerMinute;
  const windowMs = 60 * 1000;
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(ip, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed: entry.count <= limit,
    remaining,
    resetAt: entry.resetAt,
  };
}

export function rateLimitResponse(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Reset": new Date(resetAt).toISOString(),
      },
    }
  );
}
