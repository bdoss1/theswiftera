import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("luma");

const LUMA_API_BASE = "https://api.lumalabs.ai/dream-machine/v1";

export type LumaState = "queued" | "dreaming" | "completed" | "failed";

export interface LumaGeneration {
  id: string;
  state: LumaState;
  videoUrl?: string;
  thumbnailUrl?: string;
  failureReason?: string;
}

function getApiKey(): string {
  const key = process.env.LUMA_API_KEY;
  if (!key) throw new Error("LUMA_API_KEY is not set");
  return key;
}

/**
 * Submit a new video generation to Luma Dream Machine.
 * Returns the generation ID for polling.
 */
export async function startClipGeneration(
  prompt: string,
  aspectRatio: "9:16" | "16:9" | "1:1" = "9:16"
): Promise<string> {
  const apiKey = getApiKey();
  log.info({ promptLength: prompt.length, aspectRatio }, "Starting Luma generation");

  const res = await fetch(`${LUMA_API_BASE}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      loop: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Luma API ${res.status}: ${body || res.statusText}`);
  }

  const data = await res.json();
  log.info({ id: data.id, state: data.state }, "Luma generation started");
  return String(data.id);
}

/**
 * Poll a Luma generation for its current status.
 * Call every 5–10 seconds until state is "completed" or "failed".
 */
export async function pollClipGeneration(id: string): Promise<LumaGeneration> {
  const apiKey = getApiKey();

  const res = await fetch(`${LUMA_API_BASE}/generations/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Luma API ${res.status}: ${body || res.statusText}`);
  }

  const data = await res.json();

  return {
    id: data.id,
    state: data.state as LumaState,
    videoUrl: data.assets?.video ?? undefined,
    thumbnailUrl: data.assets?.image ?? undefined,
    failureReason: data.failure_reason ?? undefined,
  };
}
