import { getBrowser } from "./utils.ts";

function originsForBaseUrl(baseUrl: string): string[] {
  try {
    const origin = new URL(baseUrl).origin;
    return [`${origin}/*`, "<all_urls>"];
  } catch {
    return ["<all_urls>"];
  }
}

/** True if the extension can talk to this Linkwarden origin (or all URLs). */
export async function hasHostAccess(baseUrl: string): Promise<boolean> {
  const browserApi = getBrowser();
  if (!browserApi.permissions?.contains) return true;

  const origins = originsForBaseUrl(baseUrl);
  for (const origin of origins) {
    try {
      if (await browserApi.permissions.contains({ origins: [origin] })) {
        return true;
      }
    } catch {
      // ignore unsupported origin patterns
    }
  }
  return false;
}

/**
 * Ask the user to grant site access. Must run from a user gesture
 * (button click). Firefox may show this as “Access your data…”.
 */
export async function requestHostAccess(baseUrl: string): Promise<boolean> {
  const browserApi = getBrowser();
  if (!browserApi.permissions?.request) return true;

  const origins = originsForBaseUrl(baseUrl);
  // Prefer the specific instance origin; fall back to all URLs.
  for (const origin of origins) {
    try {
      const granted = await browserApi.permissions.request({
        origins: [origin],
      });
      if (granted) return true;
    } catch {
      // try next pattern
    }
  }
  return false;
}
