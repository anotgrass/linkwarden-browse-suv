import axios from 'axios';

export interface CollectionMember {
  userId?: number;
  user?: { id?: number };
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export interface ResponseCollections {
  color: string;
  createdAt: string;
  description: string;
  id: number;
  isPublic: boolean;
  members: CollectionMember[];
  name: string;
  ownerId: number;
  parent: null | {
    id: number;
    name: string;
  };
  parentId: null | number;
  updatedAt: string;
  _count?: { links?: number };
}

export type Collection = ResponseCollections & { pathname: string };

function buildFullPath(
  collection: ResponseCollections,
  collectionsMap: Map<number, ResponseCollections>
): string {
  const paths: string[] = [collection.name];
  let currentParent = collection.parent;
  const visited = new Set<number>([collection.id]);

  while (currentParent && !visited.has(currentParent.id)) {
    visited.add(currentParent.id);
    paths.unshift(currentParent.name);
    const parentCollection = collectionsMap.get(currentParent.id);
    currentParent = parentCollection?.parent || null;
  }

  return paths.join(' > ');
}

function withPathnames(collections: ResponseCollections[]): Collection[] {
  const collectionsMap = new Map(
    collections.map((collection) => [collection.id, collection])
  );

  return collections.map((collection) => ({
    ...collection,
    pathname: buildFullPath(collection, collectionsMap),
  }));
}

function normalizeMembers(members: CollectionMember[] | undefined) {
  if (!Array.isArray(members)) return [];
  return members
    .map((m) => {
      const userId = m.userId ?? m.user?.id;
      if (userId == null) return null;
      return {
        userId,
        canCreate: Boolean(m.canCreate),
        canUpdate: Boolean(m.canUpdate),
        canDelete: Boolean(m.canDelete),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m != null);
}

export async function getCollections(baseUrl: string, apiKey: string) {
  const url = `${baseUrl}/api/v1/collections`;

  const response = await axios.get<{ response: ResponseCollections[] }>(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return {
    ...response,
    data: {
      response: withPathnames(response.data.response),
    },
  };
}

export async function createCollection(
  baseUrl: string,
  apiKey: string,
  data: { name: string; parentId?: number | null; color?: string }
) {
  const response = await fetch(`${baseUrl}/api/v1/collections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.response || 'Failed to create collection');
  }
  return body.response as ResponseCollections;
}

export async function updateCollection(
  baseUrl: string,
  apiKey: string,
  data: {
    id: number;
    name: string;
    parentId?: number | null;
    color?: string;
    description?: string;
    isPublic?: boolean;
    members?: CollectionMember[];
  }
) {
  const payload = {
    id: data.id,
    name: data.name,
    parentId: data.parentId ?? null,
    color: data.color,
    description: data.description ?? '',
    isPublic: data.isPublic ?? false,
    members: normalizeMembers(data.members),
  };

  const response = await fetch(`${baseUrl}/api/v1/collections/${data.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.response || 'Failed to update collection');
  }
  return body.response as ResponseCollections;
}

export async function deleteCollection(
  baseUrl: string,
  apiKey: string,
  id: number
) {
  const response = await fetch(`${baseUrl}/api/v1/collections/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.response || 'Failed to delete collection');
  }
  return body.response;
}
