export interface LinkwardenUser {
  id: number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  collectionOrder?: number[];
  [key: string]: unknown;
}

function authHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function getMe(
  baseUrl: string,
  apiKey: string
): Promise<LinkwardenUser> {
  const response = await fetch(`${baseUrl}/api/v1/users/me`, {
    headers: authHeaders(apiKey),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.response || "Failed to load user");
  }
  return body.response as LinkwardenUser;
}
