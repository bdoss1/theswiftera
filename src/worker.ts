import { PrismaClient, Status, JobStatus, Platform } from "@prisma/client";
import pino from "pino";

const prisma = new PrismaClient();

// Configuration from environment
const POLL_INTERVAL = Number(process.env.WORKER_POLL_INTERVAL_MS) || 30000;
const MAX_ATTEMPTS = Number(process.env.WORKER_MAX_ATTEMPTS) || 3;
const BACKOFF_MINUTES = (process.env.WORKER_BACKOFF_MINUTES || "1,5,15").split(",").map(Number);
const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE) || 10;
const RATE_LIMIT_WINDOW_MINUTES = Number(process.env.RATE_LIMIT_WINDOW_MINUTES) || 60;
const RATE_LIMIT_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_WINDOW) || 200;
const GRAPH_API_BASE = process.env.FACEBOOK_GRAPH_API_BASE || "https://graph.facebook.com/v19.0";

const log = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
        },
      }
    : {}),
}).child({ context: "worker" });

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  link?: string | null,
  imageUrl?: string | null
): Promise<string> {
  const params: Record<string, string> = {
    message,
    access_token: accessToken,
  };

  let endpoint = `${GRAPH_API_BASE}/${pageId}/feed`;

  if (imageUrl) {
    params.url = imageUrl;
    endpoint = `${GRAPH_API_BASE}/${pageId}/photos`;
  } else if (link) {
    params.link = link;
  }

  const body = new URLSearchParams(params);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.error;
    throw new Error(`Facebook API: ${err?.message || res.statusText} (code: ${err?.code || res.status})`);
  }

  return data.id;
}

async function publishToInstagram(
  message: string,
  imageUrl: string | null
): Promise<string> {
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!igAccountId || !accessToken) {
    throw new Error("Instagram credentials not configured");
  }
  if (!imageUrl) {
    throw new Error("Instagram posts require an image");
  }

  // Create container
  const containerRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ image_url: imageUrl, caption: message, access_token: accessToken }).toString(),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok) throw new Error(`Instagram: ${containerData?.error?.message || "Container creation failed"}`);

  // Publish
  const publishRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: containerData.id, access_token: accessToken }).toString(),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok) throw new Error(`Instagram: ${publishData?.error?.message || "Publish failed"}`);

  return publishData.id;
}

async function publishToX(message: string): Promise<string> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error("X/Twitter credentials not configured");
  }

  const crypto = await import("crypto");
  const truncatedText = message.length > 280 ? message.substring(0, 277) + "..." : message;
  const url = "https://api.x.com/2/tweets";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams).sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join("&");

  const baseString = `POST&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const authHeader = `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ")}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ text: truncatedText }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`X API: ${data?.detail || data?.title || res.statusText}`);

  return data.data.id;
}

async function recordRateLimitCall() {
  const now = new Date();
  const endpoint = "feed";

  const existing = await prisma.rateLimit.findUnique({
    where: { platform_endpoint: { platform: Platform.FACEBOOK, endpoint } },
  });

  if (existing) {
    const windowStart = new Date(existing.windowStart);
    const windowEnd = new Date(windowStart.getTime() + existing.windowMinutes * 60 * 1000);

    if (now > windowEnd) {
      await prisma.rateLimit.update({
        where: { id: existing.id },
        data: { callCount: 1, windowStart: now, lastCallAt: now },
      });
    } else {
      await prisma.rateLimit.update({
        where: { id: existing.id },
        data: { callCount: existing.callCount + 1, lastCallAt: now },
      });
    }
  } else {
    await prisma.rateLimit.create({
      data: {
        platform: Platform.FACEBOOK,
        endpoint,
        callCount: 1,
        windowStart: now,
        windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
        limitPerWindow: RATE_LIMIT_PER_WINDOW,
        lastCallAt: now,
      },
    });
  }
}

async function processJobs() {
  const now = new Date();

  const jobs = await prisma.publishJob.findMany({
    where: {
      status: JobStatus.SCHEDULED,
      runAt: { lte: now },
    },
    include: { contentItem: true },
    take: BATCH_SIZE,
  });

  if (jobs.length === 0) return;

  log.info({ count: jobs.length, timestamp: now.toISOString() }, "Processing jobs");

  const fbPage = await prisma.facebookPage.findFirst();

  for (const job of jobs) {
    const item = job.contentItem;
    log.info({ id: item.id, caption: item.caption.substring(0, 60), platform: item.platform }, "Processing job");

    await prisma.publishJob.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING },
    });

    try {
      const message =
        item.hashtags.length > 0
          ? `${item.caption}\n\n${item.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
          : item.caption;

      let externalPostId: string;

      if (item.platform === "INSTAGRAM") {
        externalPostId = await publishToInstagram(message, item.imageUrl);
      } else if (item.platform === "X") {
        externalPostId = await publishToX(message);
      } else {
        if (!fbPage) {
          throw new Error("No Facebook page configured");
        }
        externalPostId = await publishToFacebook(
          fbPage.pageId,
          fbPage.pageAccessToken,
          message,
          item.postType === "LINK" ? item.linkUrl : null,
          item.postType === "IMAGE" ? item.imageUrl : null
        );
      }

      // Track rate limit for Facebook
      if (item.platform === "FACEBOOK") {
        await recordRateLimitCall().catch((e) =>
          log.warn({ error: e }, "Rate limit tracking failed")
        );
      }

      await prisma.contentItem.update({
        where: { id: item.id },
        data: { status: Status.POSTED, postedAt: new Date(), externalPostId, error: null },
      });

      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: JobStatus.SUCCESS },
      });

      log.info({ id: item.id, platform: item.platform, externalPostId }, "Published successfully");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const attempts = job.attempts + 1;

      log.error({ id: item.id, attempt: attempts, maxAttempts: MAX_ATTEMPTS, error: errorMsg }, "Publish failed");

      if (attempts >= MAX_ATTEMPTS) {
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { status: Status.FAILED, error: errorMsg },
        });
        await prisma.publishJob.update({
          where: { id: job.id },
          data: { status: JobStatus.FAILED, attempts, lastError: errorMsg },
        });
        log.error({ id: item.id }, "Max retries exhausted");
      } else {
        const backoffMinutes = BACKOFF_MINUTES[attempts - 1] || 15;
        const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await prisma.publishJob.update({
          where: { id: job.id },
          data: { status: JobStatus.SCHEDULED, attempts, lastError: errorMsg, runAt: nextAttempt, nextAttemptAt: nextAttempt },
        });
        log.info({ id: item.id, nextAttempt: nextAttempt.toISOString(), backoffMinutes }, "Scheduled retry");
      }
    }
  }
}

async function main() {
  log.info({
    pollInterval: `${POLL_INTERVAL / 1000}s`,
    maxAttempts: MAX_ATTEMPTS,
    batchSize: BATCH_SIZE,
    startedAt: new Date().toISOString(),
  }, "SwiftTok Publisher Worker started");

  await processJobs();

  setInterval(async () => {
    try {
      await processJobs();
    } catch (err) {
      log.error({ err }, "Worker loop error");
    }
  }, POLL_INTERVAL);
}

main().catch((err) => {
  log.fatal({ err }, "Worker fatal error");
  process.exit(1);
});
