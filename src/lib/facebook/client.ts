import { config } from "@/lib/config";

const GRAPH_API_BASE = config.facebook.graphApiBase;

export interface FacebookApiError {
  message: string;
  type: string;
  code: number;
}

export async function facebookGet<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    const err = data?.error as FacebookApiError | undefined;
    throw new Error(
      `Facebook API error: ${err?.message || res.statusText} (code: ${err?.code || res.status})`
    );
  }

  return data as T;
}

export async function facebookPost<T>(
  path: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);

  const body = new URLSearchParams(params);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    const err = data?.error as FacebookApiError | undefined;
    throw new Error(
      `Facebook API error: ${err?.message || res.statusText} (code: ${err?.code || res.status})`
    );
  }

  return data as T;
}
