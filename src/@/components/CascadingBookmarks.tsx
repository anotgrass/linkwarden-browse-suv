import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Globe, Hash, Loader2, Pencil, Search } from "lucide-react";
import { getConfig } from "../lib/config.ts";
import {
  deleteCollection,
  getCollections,
  updateCollection,
} from "../lib/actions/collections.ts";
import { LinkItem, faviconUrl, searchLinks } from "../lib/actions/links.ts";
import { getTags, type ResponseTags } from "../lib/actions/tags.ts";
import { getMe } from "../lib/actions/user.ts";
import { openSafeUrl } from "../lib/utils.ts";
import { toast } from "../../hooks/useToast.ts";
import CollectionDrillDown, {
  CollectionTreeNode,
} from "./CollectionDrillDown.tsx";
import NavSegment from "./NavSegment.tsx";
import { Button } from "./ui/Button.tsx";
import { Input } from "./ui/Input.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog.tsx";
import { Toaster } from "./ui/Toaster.tsx";

type NavMode = "all" | "pinned" | "collections" | "tags";

function Favicon({
  baseUrl,
  url,
  show,
}: {
  baseUrl: string;
  url: string;
  show: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(baseUrl, url);
  if (!show || failed || !src) {
    return <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return (
    <img
      src={src}
      alt=""
      className="h-4 w-4 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}

function LinkList({
  links,
  baseUrl,
  showIcons,
  loading,
  empty,
}: {
  links: LinkItem[];
  baseUrl: string;
  showIcons: boolean;
  loading?: boolean;
  empty?: string;
}) {
  const openAll = async () => {
    for (const link of links) {
      await openSafeUrl(link.url);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-3 text-center">
        {empty ?? "No links found"}
      </p>
    );
  }

  return (
    <>
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          className="list-row"
          onClick={() => void openSafeUrl(link.url)}
        >
          <Favicon baseUrl={baseUrl} url={link.url} show={showIcons} />
          <span className="truncate">{link.name || link.url}</span>
        </button>
      ))}
      {links.length > 1 ? (
        <>
          <div className="my-1.5 h-px bg-border/70" />
          <button
            type="button"
            className="list-row text-muted-foreground"
            onClick={() => void openAll()}
          >
            Open All in Tabs
          </button>
        </>
      ) : null}
    </>
  );
}

function FolderLinks({
  collectionId,
  baseUrl,
  apiKey,
  showIcons,
}: {
  collectionId: number;
  baseUrl: string;
  apiKey: string;
  showIcons: boolean;
}) {
  const linksQuery = useQuery({
    queryKey: ["cascade-links", baseUrl, collectionId],
    queryFn: () =>
      searchLinks(baseUrl, apiKey, { collectionId, sort: 4 }),
    staleTime: 30_000,
  });

  const links = linksQuery.data?.links ?? [];
  if (linksQuery.isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (links.length === 0) return null;

  return (
    <div className="mt-1 border-t border-border pt-1">
      <LinkList links={links} baseUrl={baseUrl} showIcons={showIcons} />
    </div>
  );
}

export default function CascadingBookmarks() {
  const queryClient = useQueryClient();
  const [navMode, setNavMode] = useState<NavMode>("collections");
  const [path, setPath] = useState<number[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [renameNode, setRenameNode] = useState<CollectionTreeNode | null>(
    null
  );
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const configQuery = useQuery({
    queryKey: ["ext-config"],
    queryFn: getConfig,
  });

  const baseUrl = configQuery.data?.baseUrl ?? "";
  const apiKey = configQuery.data?.apiKey ?? "";
  const showIcons = configQuery.data?.showIcons !== false;
  const ready = Boolean(baseUrl && apiKey);

  const userQuery = useQuery({
    queryKey: ["user", baseUrl],
    queryFn: () => getMe(baseUrl, apiKey),
    enabled: ready,
  });

  const collectionsQuery = useQuery({
    queryKey: ["collections", baseUrl],
    queryFn: async () => (await getCollections(baseUrl, apiKey)).data.response,
    enabled: ready,
  });

  const tagsQuery = useQuery({
    queryKey: ["browse-tags", baseUrl],
    queryFn: async () => {
      const page = await getTags(baseUrl, apiKey, 0, "");
      return page.tags;
    },
    enabled: ready && navMode === "tags",
  });

  const collections = collectionsQuery.data ?? [];

  const listParams = useMemo(() => {
    if (debounced.trim()) {
      return { query: debounced.trim(), sort: 0 as const };
    }
    if (navMode === "pinned") {
      return { pinnedOnly: true, sort: 0 as const };
    }
    if (navMode === "tags" && selectedTagId != null) {
      return { tagId: selectedTagId, sort: 4 as const };
    }
    if (navMode === "all") {
      return { sort: 0 as const };
    }
    return null;
  }, [debounced, navMode, selectedTagId]);

  const listQuery = useQuery({
    queryKey: ["cascade-list", baseUrl, listParams],
    queryFn: () => searchLinks(baseUrl, apiKey, listParams!),
    enabled:
      ready &&
      listParams != null &&
      (navMode !== "tags" || selectedTagId != null || !!debounced.trim()),
  });

  const selectedTag = (tagsQuery.data as ResponseTags[] | undefined)?.find(
    (t) => t.id === selectedTagId
  );

  const openDashboard = async () => {
    await openSafeUrl(baseUrl);
  };

  const saveRename = async () => {
    if (!renameNode || !renameValue.trim()) return;
    try {
      await updateCollection(baseUrl, apiKey, {
        id: renameNode.id,
        name: renameValue.trim(),
        parentId: renameNode.parentId,
        color: renameNode.color,
        description: renameNode.description,
        isPublic: renameNode.isPublic,
        members: renameNode.members ?? [],
      });
      toast({ title: "Renamed", variant: "success" });
      setRenameNode(null);
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Rename failed",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (node: CollectionTreeNode) => {
    if (
      !confirm(
        `Delete collection “${node.name}”? Links in it may be removed.`
      )
    ) {
      return;
    }
    try {
      await deleteCollection(baseUrl, apiKey, node.id);
      toast({ title: "Deleted", variant: "success" });
      setPath((prev) => prev.filter((id) => id !== node.id));
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      await queryClient.invalidateQueries({ queryKey: ["cascade-links"] });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Delete failed",
        variant: "destructive",
      });
    }
  };

  if (configQuery.isLoading || collectionsQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const showSearchOrFlatList =
    !!debounced.trim() || navMode === "all" || navMode === "pinned";
  const showTagLinks = navMode === "tags" && selectedTagId != null;

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0"
          onClick={() => void openDashboard()}
        >
          Manage
        </Button>
      </div>

      <NavSegment
        value={navMode}
        onChange={(mode) => {
          setNavMode(mode);
          setPath([]);
          if (mode !== "tags") setSelectedTagId(null);
        }}
        items={[
          { id: "all", label: "All" },
          { id: "pinned", label: "Pinned" },
          { id: "collections", label: "Collections" },
          { id: "tags", label: "Tags" },
        ]}
      />

      {showSearchOrFlatList ? (
        <div className="panel max-h-[520px] min-h-[420px] overflow-y-auto p-1.5">
          <LinkList
            links={listQuery.data?.links ?? []}
            baseUrl={baseUrl}
            showIcons={showIcons}
            loading={listQuery.isLoading}
            empty={
              debounced.trim()
                ? "No results"
                : navMode === "pinned"
                  ? "No pinned links"
                  : "No links found"
            }
          />
        </div>
      ) : navMode === "tags" ? (
        <div className="panel flex min-h-0 flex-1 flex-col">
          {selectedTagId != null ? (
            <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-1.5 py-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setSelectedTagId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
              <span className="truncate px-1 text-xs font-medium">
                {selectedTag?.name ?? "Tag"}
              </span>
            </div>
          ) : null}
          <div className="max-h-[500px] min-h-[420px] overflow-y-auto p-1.5">
            {showTagLinks ? (
              <LinkList
                links={listQuery.data?.links ?? []}
                baseUrl={baseUrl}
                showIcons={showIcons}
                loading={listQuery.isLoading}
              />
            ) : tagsQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (tagsQuery.data ?? []).length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                You have no Tags...
              </p>
            ) : (
              (tagsQuery.data as ResponseTags[]).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="list-row"
                  onClick={() => setSelectedTagId(tag.id)}
                >
                  <Hash className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate font-medium">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {tag._count?.links ?? 0}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <CollectionDrillDown
          collections={collections}
          collectionOrder={userQuery.data?.collectionOrder}
          path={path}
          onPathChange={setPath}
          mode="browse"
          listClassName="min-h-[420px] max-h-[500px]"
          onRename={(node) => {
            setRenameNode(node);
            setRenameValue(node.name);
          }}
          onDelete={(node) => void handleDelete(node)}
          afterFolders={(current) =>
            current ? (
              <FolderLinks
                collectionId={current.id}
                baseUrl={baseUrl}
                apiKey={apiKey}
                showIcons={showIcons}
              />
            ) : null
          }
        />
      )}

      <Dialog
        open={!!renameNode}
        onOpenChange={(open) => {
          if (!open) setRenameNode(null);
        }}
      >
        <DialogContent className="max-w-[320px] p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Rename collection
            </DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveRename();
            }}
          />
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setRenameNode(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveRename()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
