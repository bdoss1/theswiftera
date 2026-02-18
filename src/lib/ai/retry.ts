import { config } from "@/lib/config";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("retry");

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const { maxRetries, retryDelayMs } = config.openai;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      if (isLastAttempt) {
        log.error({ attempt, label, error: errorMsg }, "All retries exhausted");
        throw err;
      }

      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      log.warn({ attempt, label, error: errorMsg, nextRetryMs: delay }, "Retrying after error");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error(`${label}: All retries exhausted`);
}
