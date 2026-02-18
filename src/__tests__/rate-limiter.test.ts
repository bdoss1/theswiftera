import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limiter";

function createMockRequest(ip: string = "127.0.0.1"): Request & { headers: Headers; nextUrl: URL } {
  const headers = new Headers();
  headers.set("x-forwarded-for", ip);
  return {
    headers,
    nextUrl: new URL("http://localhost:3000/api/test"),
  } as unknown as Request & { headers: Headers; nextUrl: URL };
}

describe("checkRateLimit", () => {
  // Note: the store is module-level, so tests share state.
  // We use unique IPs per test to avoid collisions.

  it("allows requests within the limit", () => {
    const req = createMockRequest("10.0.0.1");
    const result = checkRateLimit(req as never);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("tracks remaining requests", () => {
    const req = createMockRequest("10.0.0.2");
    const first = checkRateLimit(req as never);
    const second = checkRateLimit(req as never);
    expect(second.remaining).toBe(first.remaining - 1);
  });

  it("returns a reset timestamp", () => {
    const req = createMockRequest("10.0.0.3");
    const result = checkRateLimit(req as never);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
