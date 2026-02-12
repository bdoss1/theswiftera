import { PrismaClient, Status, JobStatus } from "@prisma/client";

const prisma = new PrismaClient();
const POLL_INTERVAL = Number(process.env.WORKER_POLL_INTERVAL_MS) || 30000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MINUTES = [1, 5, 15];

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  link?: string | null
): Promise<string> {
  const params: Record<string, string> = {
    message,
    access_token: accessToken,
  };
  if (link) params.link = link;

  const body = new URLSearchParams(params);
  const res = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
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

async function processJobs() {
  const now = new Date();

  const jobs = await prisma.publishJob.findMany({
    where: {
      status: JobStatus.SCHEDULED,
      runAt: { lte: now },
    },
    include: { contentItem: true },
    take: 10,
  });

  if (jobs.length === 0) return;

  console.log(`[${now.toISOString()}] Found ${jobs.length} job(s) to process`);

  const fbPage = await prisma.facebookPage.findFirst();
  if (!fbPage) {
    console.error("No Facebook page configured. Skipping all jobs.");
    return;
  }

  for (const job of jobs) {
    const item = job.contentItem;
    console.log(`  Processing: ${item.id} — "${item.caption.substring(0, 60)}..."`);

    // Mark as running
    await prisma.publishJob.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING },
    });

    try {
      const message =
        item.hashtags.length > 0
          ? `${item.caption}\n\n${item.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
          : item.caption;

      const externalPostId = await publishToFacebook(
        fbPage.pageId,
        fbPage.pageAccessToken,
        message,
        item.postType === "LINK" ? item.linkUrl : null
      );

      // Success
      await prisma.contentItem.update({
        where: { id: item.id },
        data: {
          status: Status.POSTED,
          postedAt: new Date(),
          externalPostId,
          error: null,
        },
      });

      await prisma.publishJob.update({
        where: { id: job.id },
        data: { status: JobStatus.SUCCESS },
      });

      console.log(`  SUCCESS: ${item.id} → Facebook post ${externalPostId}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const attempts = job.attempts + 1;

      console.error(`  FAILED (attempt ${attempts}/${MAX_ATTEMPTS}): ${errorMsg}`);

      if (attempts >= MAX_ATTEMPTS) {
        // Max retries reached
        await prisma.contentItem.update({
          where: { id: item.id },
          data: { status: Status.FAILED, error: errorMsg },
        });
        await prisma.publishJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            attempts,
            lastError: errorMsg,
          },
        });
        console.error(`  GAVE UP on ${item.id} after ${MAX_ATTEMPTS} attempts`);
      } else {
        // Schedule retry with backoff
        const backoffMinutes = BACKOFF_MINUTES[attempts - 1] || 15;
        const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await prisma.publishJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.SCHEDULED,
            attempts,
            lastError: errorMsg,
            runAt: nextAttempt,
            nextAttemptAt: nextAttempt,
          },
        });
        console.log(`  Retrying ${item.id} at ${nextAttempt.toISOString()} (backoff: ${backoffMinutes}m)`);
      }
    }
  }
}

async function main() {
  console.log("=========================================");
  console.log("  SwiftTok Publisher Worker");
  console.log("  The Swift Era Content Engine");
  console.log("=========================================");
  console.log(`  Poll interval: ${POLL_INTERVAL / 1000}s`);
  console.log(`  Max attempts: ${MAX_ATTEMPTS}`);
  console.log(`  Started at: ${new Date().toISOString()}`);
  console.log("=========================================\n");

  // Run immediately, then poll
  await processJobs();

  setInterval(async () => {
    try {
      await processJobs();
    } catch (err) {
      console.error("Worker loop error:", err);
    }
  }, POLL_INTERVAL);
}

main().catch((err) => {
  console.error("Worker fatal error:", err);
  process.exit(1);
});
