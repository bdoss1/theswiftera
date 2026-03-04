import crypto from "crypto";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("trends");

export interface Trend {
  id: string;
  name: string;
  source: "x" | "reddit";
  volume?: number;
  url?: string;
  subreddit?: string;
  /** Brand pillar hint from the subreddit context */
  pillarHint?: string;
}

const REDDIT_SUBREDDITS: Array<{ name: string; pillarHint: string }> = [
  { name: "motorcycles", pillarHint: "BROTHERHOOD" },
  { name: "Entrepreneur", pillarHint: "ENTREPRENEURSHIP" },
  { name: "technology", pillarHint: "ENTREPRENEURSHIP" },
  { name: "artificial", pillarHint: "ENTREPRENEURSHIP" },
  { name: "selfimprovement", pillarHint: "LEADERSHIP" },
  { name: "Fatherhood", pillarHint: "FAMILY" },
];

// ---------------------------------------------------------------------------
// X / Twitter trends  (OAuth 1.0a  —  requires X_API_* env vars)
// ---------------------------------------------------------------------------

function buildOAuthHeader(
  method: string,
  url: string,
  queryParams: Record<string, string>
): string {
  const apiKey = process.env.X_API_KEY!;
  const apiSecret = process.env.X_API_SECRET!;
  const accessToken = process.env.X_ACCESS_TOKEN!;
  const accessSecret = process.env.X_ACCESS_SECRET!;

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

  const allParams: Record<string, string> = { ...oauthParams, ...queryParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  return `OAuth ${Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(", ")}`;
}

export async function fetchXTrends(): Promise<Trend[]> {
  const { X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET } = process.env;
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_SECRET) {
    log.debug("X credentials not configured — skipping X trends");
    return [];
  }

  const url = "https://api.twitter.com/1.1/trends/place.json";
  const queryParams = { id: "1" }; // 1 = worldwide

  try {
    const authHeader = buildOAuthHeader("GET", url, queryParams);
    const res = await fetch(`${url}?id=1`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      log.warn({ status: res.status }, "X trends API returned an error");
      return [];
    }

    const data = await res.json();
    const raw: Array<{ name: string; tweet_volume: number | null; url: string }> =
      data[0]?.trends ?? [];

    return raw
      .filter((t) => t.tweet_volume && t.tweet_volume > 0)
      .slice(0, 20)
      .map((t, i) => ({
        id: `x-${i}`,
        name: t.name,
        source: "x",
        volume: t.tweet_volume ?? undefined,
        url: t.url,
      }));
  } catch (err) {
    log.warn({ err }, "X trends fetch failed");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Reddit hot posts  (no auth required — public JSON API)
// ---------------------------------------------------------------------------

export async function fetchRedditTrends(): Promise<Trend[]> {
  const results: Trend[] = [];

  for (const sub of REDDIT_SUBREDDITS) {
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub.name}/hot.json?limit=6&raw_json=1`,
        {
          headers: { "User-Agent": "swifttok/1.0 content-engine" },
          signal: AbortSignal.timeout(8_000),
          next: { revalidate: 300 }, // cache for 5 minutes (Next.js fetch cache)
        }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const posts: Array<{ data: Record<string, unknown> }> = data?.data?.children ?? [];

      for (const post of posts) {
        const p = post.data;
        if (p.stickied || p.over_18) continue;
        results.push({
          id: `reddit-${p.id}`,
          name: String(p.title),
          source: "reddit",
          volume: Number(p.score) || undefined,
          url: `https://reddit.com${String(p.permalink)}`,
          subreddit: sub.name,
          pillarHint: sub.pillarHint,
        });
      }
    } catch (err) {
      log.warn({ subreddit: sub.name, err }, "Reddit subreddit fetch failed");
    }
  }

  // sort by score descending
  return results.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
}

// ---------------------------------------------------------------------------
// Combined fetch
// ---------------------------------------------------------------------------

export async function fetchAllTrends(): Promise<{
  xTrends: Trend[];
  redditTrends: Trend[];
  errors: string[];
}> {
  const [xResult, redditResult] = await Promise.allSettled([
    fetchXTrends(),
    fetchRedditTrends(),
  ]);

  const errors: string[] = [];
  if (xResult.status === "rejected")
    errors.push(`X/Twitter: ${(xResult.reason as Error)?.message ?? "failed"}`);
  if (redditResult.status === "rejected")
    errors.push(`Reddit: ${(redditResult.reason as Error)?.message ?? "failed"}`);

  return {
    xTrends: xResult.status === "fulfilled" ? xResult.value : [],
    redditTrends: redditResult.status === "fulfilled" ? redditResult.value : [],
    errors,
  };
}
