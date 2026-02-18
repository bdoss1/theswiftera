import { facebookPost, facebookGet } from "./client";

interface PublishResult {
  id: string;
}

interface PageInfo {
  name: string;
  id: string;
}

export async function publishTextPost(
  pageId: string,
  accessToken: string,
  message: string
): Promise<string> {
  const result = await facebookPost<PublishResult>(`/${pageId}/feed`, {
    message,
    access_token: accessToken,
  });
  return result.id;
}

export async function publishLinkPost(
  pageId: string,
  accessToken: string,
  message: string,
  link: string
): Promise<string> {
  const result = await facebookPost<PublishResult>(`/${pageId}/feed`, {
    message,
    link,
    access_token: accessToken,
  });
  return result.id;
}

/**
 * Publish a photo post to Facebook.
 * The imageUrl must be a publicly accessible URL.
 */
export async function publishImagePost(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrl: string
): Promise<string> {
  const result = await facebookPost<PublishResult>(`/${pageId}/photos`, {
    message,
    url: imageUrl,
    access_token: accessToken,
  });
  return result.id;
}

export async function testConnection(
  pageId: string,
  accessToken: string
): Promise<{ success: boolean; pageName?: string; error?: string }> {
  try {
    const info = await facebookGet<PageInfo>(`/${pageId}`, {
      fields: "name",
      access_token: accessToken,
    });
    return { success: true, pageName: info.name };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
