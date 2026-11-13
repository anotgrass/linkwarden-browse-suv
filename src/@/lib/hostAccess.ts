import { getBrowser } from "./utils.ts";

/** Firefox shows this as “Access your data for all websites”. */
const ALL_URLS = "<all_urls>";

function instanceOriginPattern(baseUrl: string): string | null {
  try {
    return `${new URL(baseUrl).origin}/*`;
  } catch {
    return null;
  }
}

/** True if the extension can talk to this Linkwarden origin (or all URLs). */
export async function hasHostAccess(baseUrl: string): Promise<boolean> {
  const browserApi = getBrowser();
  if (!browserApi.permissions?.contains) return true;

  try {
    if (await browserApi.permissions.contains({ origins: [ALL_URLS] })) {
      return true;
    }
  } catch {
    // ignore
  }

  const instance = instanceOriginPattern(baseUrl);
  if (!instance) return false;
  try {
    return await browserApi.permissions.contains({ origins: [instance] });
  } catch {
    return false;
  }
}

/**
 * Ask for full host access so API calls, favicons, and page capture work
 * regardless of which Linkwarden URL is configured. Must run from a click.
 */
export async function requestHostAccess(_baseUrl: string): Promise<boolean> {
  const browserApi = getBrowser();
  if (!browserApi.permissions?.request) return true;

  try {
    return await browserApi.permissions.request({ origins: [ALL_URLS] });
  } catch {
    // Some builds reject <all_urls> in request(); fall back to the instance.
    const instance = instanceOriginPattern(_baseUrl);
    if (!instance) return false;
    try {
      return await browserApi.permissions.request({ origins: [instance] });
    } catch {
      return false;
    }
  }
}
