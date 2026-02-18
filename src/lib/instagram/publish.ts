import { config } from "@/lib/config";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("instagram");
const GRAPH_API_BASE = config.facebook.graphApiBase;

/**
 * Publish a post to Instagram via the Meta Graph API.
 * Requires an Instagram Business Account linked to a Facebook Page.
 *
 * Flow:
 * 1. Create a media container with the image/caption
 * 2. Publish the container
 */
export async function publishToInstagram(
  caption: string,
  imageUrl?: string | null
): Promise<string> {
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!igAccountId) {
    throw new Error("Instagram publishing requires INSTAGRAM_ACCOUNT_ID environment variable");
  }
  if (!accessToken) {
    throw new Error("Instagram publishing requires INSTAGRAM_ACCESS_TOKEN or FACEBOOK_PAGE_ACCESS_TOKEN");
  }

  log.info({ hasImage: !!imageUrl }, "Publishing to Instagram");

  if (!imageUrl) {
    throw new Error("Instagram posts require an image URL. Text-only posts are not supported.");
  }

  // Step 1: Create media container
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  });

  const containerRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: containerParams.toString(),
  });

  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    const err = containerData?.error;
    throw new Error(`Instagram API: ${err?.message || containerRes.statusText} (code: ${err?.code || containerRes.status})`);
  }

  const containerId = containerData.id;

  // Step 2: Publish the container
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  });

  const publishRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: publishParams.toString(),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    const err = publishData?.error;
    throw new Error(`Instagram API: ${err?.message || publishRes.statusText} (code: ${err?.code || publishRes.status})`);
  }

  log.info({ postId: publishData.id }, "Instagram post published");
  return publishData.id;
}
