import { describe, it, expect } from "vitest";
import { config } from "@/lib/config";

describe("config", () => {
  it("has default worker settings", () => {
    expect(config.worker.pollIntervalMs).toBeGreaterThan(0);
    expect(config.worker.maxAttempts).toBe(3);
    expect(config.worker.backoffMinutes).toEqual([1, 5, 15]);
    expect(config.worker.batchSize).toBe(10);
  });

  it("has default rate limit settings", () => {
    expect(config.rateLimit.windowMinutes).toBe(60);
    expect(config.rateLimit.perWindow).toBe(200);
    expect(config.rateLimit.apiRequestsPerMinute).toBe(60);
  });

  it("has default openai settings", () => {
    expect(config.openai.model).toBe("gpt-4o-mini");
    expect(config.openai.maxRetries).toBe(3);
    expect(config.openai.temperature).toBe(0.85);
    expect(config.openai.maxTokens).toBe(4000);
  });

  it("has default facebook settings", () => {
    expect(config.facebook.graphApiBase).toContain("graph.facebook.com");
  });

  it("has default content settings", () => {
    expect(config.content.maxVariants).toBe(10);
    expect(config.content.defaultScheduleTimes).toHaveLength(9);
    expect(config.content.defaultScheduleTimes[0]).toBe("09:00");
  });

  it("has default upload settings", () => {
    expect(config.upload.maxFileSizeMb).toBe(10);
    expect(config.upload.allowedTypes).toContain("image/jpeg");
    expect(config.upload.allowedTypes).toContain("image/png");
  });

  it("has auth disabled by default", () => {
    expect(config.auth.enabled).toBe(false);
  });
});
