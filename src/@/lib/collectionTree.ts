import { Collection } from "./actions/collections.ts";

export type CollectionTreeNode = Collection & { children: CollectionTreeNode[] };

export function buildCollectionTree(
  collections: Collection[],
  order?: number[]
): CollectionTreeNode[] {
  const byId = new Map<number, CollectionTreeNode>();
  collections.forEach((c) => byId.set(c.id, { ...c, children: [] }));
  const roots: CollectionTreeNode[] = [];
  collections.forEach((c) => {
    const node = byId.get(c.id)!;
    if (c.parentId != null && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  if (order?.length) {
    const position = new Map(order.map((id, i) => [id, i]));
    roots.sort(
      (a, b) =>
        (position.get(a.id) ?? order.length) -
        (position.get(b.id) ?? order.length)
    );
  }
  return roots;
}

export function findCollectionNode(
  roots: CollectionTreeNode[],
  id: number
): CollectionTreeNode | null {
  for (const root of roots) {
    if (root.id === id) return root;
    const stack = [...root.children];
    while (stack.length) {
      const n = stack.pop()!;
      if (n.id === id) return n;
      stack.push(...n.children);
    }
  }
  return null;
}
