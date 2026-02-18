import { createChildLogger } from "@/lib/logger";
import crypto from "crypto";

const log = createChildLogger("x-twitter");

const X_API_BASE = "https://api.x.com/2";

/**
 * Publish a tweet to X (formerly Twitter) via the v2 API.
 * Requires OAuth 1.0a credentials.
 */
export async function publishToX(text: string): Promise<string> {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error(
      "X/Twitter publishing requires X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_SECRET environment variables"
    );
  }

  // Truncate to X's character limit
  const truncatedText = text.length > 280 ? text.substring(0, 277) + "..." : text;

  log.info({ length: truncatedText.length }, "Publishing to X");

  const url = `${X_API_BASE}/tweets`;
  const method = "POST";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  // Build OAuth signature
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join("&");

  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const authHeader = `OAuth ${Object.entries({
    ...oauthParams,
    oauth_signature: signature,
  })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ")}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: truncatedText }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `X API error: ${data?.detail || data?.title || res.statusText} (status: ${res.status})`
    );
  }

  log.info({ tweetId: data.data.id }, "Tweet published");
  return data.data.id;
}
