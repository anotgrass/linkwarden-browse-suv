import { ReactNode, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Folder,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Collection } from "../lib/actions/collections.ts";
import {
  CollectionTreeNode,
  buildCollectionTree,
  findCollectionNode,
} from "../lib/collectionTree.ts";
import { Button } from "./ui/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/DropDownMenu.tsx";
import { cn } from "../lib/utils.ts";

export type { CollectionTreeNode };

type Props = {
  collections: Collection[];
  collectionOrder?: number[];
  path?: number[];
  onPathChange?: (path: number[]) => void;
  mode?: "browse" | "select";
  onSelect?: (collection: Collection) => void;
  onRename?: (node: CollectionTreeNode) => void;
  onDelete?: (node: CollectionTreeNode) => void;
  afterFolders?: (current: CollectionTreeNode | null) => ReactNode;
  className?: string;
  listClassName?: string;
  emptyMessage?: string;
};

export default function CollectionDrillDown({
  collections,
  collectionOrder,
  path: controlledPath,
  onPathChange,
  mode = "browse",
  onSelect,
  onRename,
  onDelete,
  afterFolders,
  className,
  listClassName,
  emptyMessage = "No collections",
}: Props) {
  const [internalPath, setInternalPath] = useState<number[]>([]);
  const path = controlledPath ?? internalPath;
  const setPath = (next: number[] | ((prev: number[]) => number[])) => {
    const value = typeof next === "function" ? next(path) : next;
    onPathChange?.(value);
    if (controlledPath === undefined) setInternalPath(value);
  };

  const tree = useMemo(
    () => buildCollectionTree(collections, collectionOrder),
    [collections, collectionOrder]
  );

  const currentNode =
    path.length > 0 ? findCollectionNode(tree, path[path.length - 1]) : null;
  const folders: CollectionTreeNode[] = currentNode
    ? currentNode.children
    : tree;
  const breadcrumb = path
    .map((id) => findCollectionNode(tree, id))
    .filter((n): n is CollectionTreeNode => n != null);

  const openFolder = (id: number) => setPath((prev) => [...prev, id]);
  const goBack = () => setPath((prev) => prev.slice(0, -1));
  const goToDepth = (depth: number) => setPath((prev) => prev.slice(0, depth));

  const selectCollection = (node: CollectionTreeNode) => {
    onSelect?.(node);
  };

  const showFolderActions = mode === "browse" && (onRename || onDelete);

  return (
    <div className={cn("panel flex min-h-0 flex-1 flex-col", className)}>
      {path.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-1.5 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-xs text-muted-foreground">
            <button
              type="button"
              className="shrink-0 rounded-md px-1.5 py-0.5 hover:bg-accent hover:text-foreground"
              onClick={() => goToDepth(0)}
            >
              Root
            </button>
            {breadcrumb.map((node, i) => (
              <span key={node.id} className="flex min-w-0 items-center">
                <span className="shrink-0 opacity-40">/</span>
                <button
                  type="button"
                  className={cn(
                    "truncate rounded-md px-1.5 py-0.5 max-w-[100px]",
                    i === breadcrumb.length - 1
                      ? "font-medium text-foreground"
                      : "hover:bg-accent hover:text-foreground"
                  )}
                  onClick={() => goToDepth(i + 1)}
                  title={node.name}
                >
                  {node.name}
                </button>
              </span>
            ))}
          </nav>
          {mode === "select" && currentNode ? (
            <Button
              type="button"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={() => selectCollection(currentNode)}
            >
              Select
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className={cn("overflow-y-auto p-1.5", listClassName)}>
        {folders.map((node) => (
          <div key={node.id} className="group flex items-center gap-0.5">
            {mode === "select" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                title={`Select ${node.name}`}
                onClick={() => selectCollection(node)}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            <button
              type="button"
              className="list-row min-w-0 flex-1"
              onClick={() => openFolder(node.id)}
            >
              <Folder
                className="h-4 w-4 shrink-0"
                style={{ color: node.color || undefined }}
              />
              <span className="flex-1 truncate font-medium">{node.name}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
            {showFolderActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">Folder actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRename ? (
                    <DropdownMenuItem onClick={() => onRename(node)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                  ) : null}
                  {onDelete ? (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(node)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ))}

        {afterFolders?.(currentNode)}

        {path.length === 0 && folders.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {emptyMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
