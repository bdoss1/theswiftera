import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@/lib/ai/retry";

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, "test");
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockResolvedValue("success");

    const result = await withRetry(fn, "test");
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max retries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(withRetry(fn, "test")).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3); // default maxRetries
  });
});
