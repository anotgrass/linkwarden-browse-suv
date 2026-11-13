import captureScreenshot from "../screenshot.ts";
import { bookmarkFormValues } from "../validators/bookmarkForm.ts";
import axios from "axios";
// import { bookmarkMetadata } from '../cache.ts';

export async function postLink(
  baseUrl: string,
  uploadImage: boolean,
  data: bookmarkFormValues,
  setState: (state: "capturing" | "uploading" | null) => void,
  apiKey: string
) {
  const url = `${baseUrl}/api/v1/links`;

  if (uploadImage) {
    setState("capturing");
    const screenshot = await captureScreenshot();
    setState("uploading");

    const link = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const { id } = link.data.response;
    const archiveUrl = `${baseUrl}/api/v1/archives/${id}?format=0`;

    const formData = new FormData();
    formData.append("file", screenshot, "screenshot.png");

    await axios.post(archiveUrl, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    setState(null);

    return link;
  } else {
    return await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }
}

export async function postLinkFetch(
  baseUrl: string,
  data: bookmarkFormValues,
  apiKey: string
) {
  const url = `${baseUrl}/api/v1/links`;

  return await fetch(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function updateLinkFetch(
  baseUrl: string,
  id: number,
  data: bookmarkFormValues,
  apiKey: string
) {
  const url = `${baseUrl}/api/v1/links/${id}`;

  return await fetch(url, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export async function deleteLinkFetch(
  baseUrl: string,
  id: number,
  apiKey: string
) {
  const url = `${baseUrl}/api/v1/links/${id}`;

  return await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

/** UI-facing delete that throws when the API rejects the request. */
export async function deleteLink(
  baseUrl: string,
  id: number,
  apiKey: string
): Promise<void> {
  const response = await deleteLinkFetch(baseUrl, id, apiKey);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      detail.trim() || `Failed to delete link (${response.status})`
    );
  }
}

export interface LinkTag {
  id?: number;
  name: string;
}

export interface LinkItem {
  id: number;
  name: string;
  url: string;
  description?: string | null;
  collectionId?: number;
  collection?: {
    id: number;
    name: string;
    ownerId?: number;
  };
  tags?: LinkTag[];
  pinnedBy?: number[] | { id: number }[];
  collectionOrder?: number;
  createdAt?: string;
}

export type LinkSort = 0 | 1 | 2 | 3 | 4;

export interface SearchLinksParams {
  collectionId?: number | null;
  tagId?: number | null;
  pinnedOnly?: boolean;
  query?: string;
  cursor?: number;
  sort?: LinkSort;
}

export interface SearchLinksResult {
  links: LinkItem[];
  nextCursor?: number | null;
}

function authHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function searchLinks(
  baseUrl: string,
  apiKey: string,
  params: SearchLinksParams = {}
): Promise<SearchLinksResult> {
  const search = new URLSearchParams();
  search.set("sort", String(params.sort ?? 4));
  if (params.cursor != null) search.set("cursor", String(params.cursor));
  if (params.collectionId != null) {
    search.set("collectionId", String(params.collectionId));
  }
  if (params.tagId != null) {
    search.set("tagId", String(params.tagId));
  }
  if (params.pinnedOnly) {
    search.set("pinnedOnly", "true");
  }
  if (params.query?.trim()) {
    search.set("searchQueryString", params.query.trim());
  }

  const response = await fetch(`${baseUrl}/api/v1/search?${search}`, {
    headers: authHeaders(apiKey),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.response || body.message || "Failed to search links");
  }

  const body = await response.json();
  const data = body.data ?? body.response ?? body;
  const links: LinkItem[] = data.links ?? data ?? [];
  return {
    links: Array.isArray(links) ? links : [],
    nextCursor: data.nextCursor ?? null,
  };
}

export function faviconUrl(baseUrl: string, linkUrl: string) {
  try {
    const page = new URL(linkUrl);
    if (page.protocol !== "http:" && page.protocol !== "https:") {
      return "";
    }
    const root = new URL(baseUrl);
    if (root.protocol !== "http:" && root.protocol !== "https:") {
      return "";
    }
    return `${root.origin}/api/v1/getFavicon?url=${encodeURIComponent(linkUrl)}`;
  } catch {
    return "";
  }
}

export async function checkLinkExists(
  baseUrl: string,
  apiKey: string,
  linkUrl: string | undefined
): Promise<boolean> {
  if (!baseUrl || !apiKey || !linkUrl) {
    return false;
  }

  const url =
    `${baseUrl}/api/v1/search?sort=0&searchQueryString=` +
    encodeURIComponent(`url:${linkUrl}`);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const { data } = await response.json();

    return !!data && data.links?.length > 0;
  } catch (error) {
    console.error(error);
    return false;
  }
}
