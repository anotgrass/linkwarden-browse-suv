import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Globe,
  Hash,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { getConfig } from "../lib/config.ts";
import {
  deleteCollection,
  getCollections,
  updateCollection,
} from "../lib/actions/collections.ts";
import {
  LinkItem,
  deleteLink,
  faviconUrl,
  searchLinks,
} from "../lib/actions/links.ts";
import { getTags, type ResponseTags } from "../lib/actions/tags.ts";
import { getMe } from "../lib/actions/user.ts";
import { hasHostAccess, requestHostAccess } from "../lib/hostAccess.ts";
import { openSafeUrl } from "../lib/utils.ts";
import { toast } from "../../hooks/useToast.ts";
import CollectionDrillDown, {
  CollectionTreeNode,
} from "./CollectionDrillDown.tsx";
import NavSegment from "./NavSegment.tsx";
import { Button } from "./ui/Button.tsx";
import { Checkbox } from "./ui/CheckBox.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/DropDownMenu.tsx";
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
  selectMode,
  onSelectModeChange,
  selectedIds,
  onSelectedIdsChange,
  onDeleteLink,
  onDeleteLinks,
}: {
  links: LinkItem[];
  baseUrl: string;
  showIcons: boolean;
  loading?: boolean;
  empty?: string;
  selectMode: boolean;
  onSelectModeChange: (on: boolean) => void;
  selectedIds: Set<number>;
  onSelectedIdsChange: (ids: Set<number>) => void;
  onDeleteLink: (link: LinkItem) => void;
  onDeleteLinks: (links: LinkItem[]) => void;
}) {
  const openAll = async () => {
    for (const link of links) {
      await openSafeUrl(link.url);
    }
  };

  const allSelected =
    links.length > 0 && links.every((link) => selectedIds.has(link.id));
  const selectedLinks = links.filter((link) => selectedIds.has(link.id));

  const toggleId = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectedIdsChange(next);
  };

  const selectAll = () => {
    onSelectedIdsChange(new Set(links.map((link) => link.id)));
  };

  const clearSelection = () => {
    onSelectedIdsChange(new Set());
  };

  const exitSelectMode = () => {
    onSelectedIdsChange(new Set());
    onSelectModeChange(false);
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
      <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs text-muted-foreground">
        {selectMode ? (
          <>
            <button
              type="button"
              className="hover:text-foreground"
              onClick={() => (allSelected ? clearSelection() : selectAll())}
            >
              {allSelected ? "Clear selection" : "Select all"}
            </button>
            <div className="flex items-center gap-2">
              {selectedLinks.length > 0 ? (
                <>
                  <span>{selectedLinks.length} selected</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => onDeleteLinks(selectedLinks)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              ) : null}
              <button
                type="button"
                className="hover:text-foreground"
                onClick={exitSelectMode}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => onSelectModeChange(true)}
          >
            Select
          </button>
        )}
      </div>
      {links.map((link) => {
        const checked = selectedIds.has(link.id);
        return (
          <div key={link.id} className="group list-row">
            {selectMode ? (
              <Checkbox
                checked={checked}
                onCheckedChange={(value) =>
                  toggleId(link.id, value === true)
                }
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${link.name || link.url}`}
              />
            ) : null}
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => void openSafeUrl(link.url)}
            >
              <Favicon baseUrl={baseUrl} url={link.url} show={showIcons} />
              <span className="truncate">{link.name || link.url}</span>
            </button>
            {!selectMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">Link actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteLink(link)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        );
      })}
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
  selectMode,
  onSelectModeChange,
  selectedIds,
  onSelectedIdsChange,
  onDeleteLink,
  onDeleteLinks,
}: {
  collectionId: number;
  baseUrl: string;
  apiKey: string;
  showIcons: boolean;
  selectMode: boolean;
  onSelectModeChange: (on: boolean) => void;
  selectedIds: Set<number>;
  onSelectedIdsChange: (ids: Set<number>) => void;
  onDeleteLink: (link: LinkItem) => void;
  onDeleteLinks: (links: LinkItem[]) => void;
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
      <LinkList
        links={links}
        baseUrl={baseUrl}
        showIcons={showIcons}
        selectMode={selectMode}
        onSelectModeChange={onSelectModeChange}
        selectedIds={selectedIds}
        onSelectedIdsChange={onSelectedIdsChange}
        onDeleteLink={onDeleteLink}
        onDeleteLinks={onDeleteLinks}
      />
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
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<number>>(
    () => new Set()
  );
  const [linkSelectMode, setLinkSelectMode] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSelectedLinkIds(new Set());
    setLinkSelectMode(false);
  }, [navMode, debounced, selectedTagId, path]);

  const configQuery = useQuery({
    queryKey: ["ext-config"],
    queryFn: getConfig,
  });

  const baseUrl = configQuery.data?.baseUrl ?? "";
  const apiKey = configQuery.data?.apiKey ?? "";
  const showIcons = configQuery.data?.showIcons !== false;
  const ready = Boolean(baseUrl && apiKey);

  const hostAccessQuery = useQuery({
    queryKey: ["host-access", baseUrl],
    queryFn: () => hasHostAccess(baseUrl),
    enabled: ready,
    staleTime: 5_000,
  });
  const hostOk = hostAccessQuery.data === true;
  const hostChecked = hostAccessQuery.isSuccess || hostAccessQuery.isError;
  // If the permissions API is missing, treat as allowed (Chromium installs).
  const canFetch = ready && (hostOk || (hostChecked && hostAccessQuery.data !== false));

  const userQuery = useQuery({
    queryKey: ["user", baseUrl],
    queryFn: () => getMe(baseUrl, apiKey),
    enabled: canFetch,
  });

  const collectionsQuery = useQuery({
    queryKey: ["collections", baseUrl],
    queryFn: async () => (await getCollections(baseUrl, apiKey)).data.response,
    enabled: canFetch,
  });

  const tagsQuery = useQuery({
    queryKey: ["browse-tags", baseUrl],
    queryFn: async () => {
      const page = await getTags(baseUrl, apiKey, 0, "");
      return page.tags;
    },
    enabled: canFetch && navMode === "tags",
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
      canFetch &&
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

  const invalidateLinkQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cascade-links"] });
    await queryClient.invalidateQueries({ queryKey: ["cascade-list"] });
    await queryClient.invalidateQueries({ queryKey: ["browse-tags"] });
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
      await invalidateLinkQueries();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Delete failed",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLink = async (link: LinkItem) => {
    const label = link.name || link.url;
    if (!confirm(`Delete link “${label}”?`)) return;
    try {
      await deleteLink(baseUrl, link.id, apiKey);
      setSelectedLinkIds((prev) => {
        const next = new Set(prev);
        next.delete(link.id);
        return next;
      });
      toast({ title: "Deleted", variant: "success" });
      await invalidateLinkQueries();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Delete failed",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLinks = async (links: LinkItem[]) => {
    if (links.length === 0) return;
    if (
      !confirm(
        links.length === 1
          ? `Delete link “${links[0].name || links[0].url}”?`
          : `Delete ${links.length} links?`
      )
    ) {
      return;
    }
    const results = await Promise.allSettled(
      links.map((link) => deleteLink(baseUrl, link.id, apiKey))
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const deleted = results.length - failed;
    setSelectedLinkIds(new Set());
    if (failed === 0) setLinkSelectMode(false);
    await invalidateLinkQueries();
    if (failed === 0) {
      toast({
        title: deleted === 1 ? "Deleted" : `Deleted ${deleted} links`,
        variant: "success",
      });
      return;
    }
    toast({
      title: "Delete finished with errors",
      description: `${deleted} deleted, ${failed} failed`,
      variant: "destructive",
    });
  };

  const grantHostAccess = async () => {
    const granted = await requestHostAccess(baseUrl);
    await queryClient.invalidateQueries({ queryKey: ["host-access"] });
    if (granted) {
      await queryClient.invalidateQueries({ queryKey: ["collections"] });
      await queryClient.invalidateQueries({ queryKey: ["cascade-list"] });
      await queryClient.invalidateQueries({ queryKey: ["cascade-links"] });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      toast({ title: "Access granted", variant: "success" });
      return;
    }
    toast({
      title: "Permission needed",
      description:
        "Allow site access when Firefox prompts, or turn on “Access your data for all websites” for this extension in about:addons.",
      variant: "destructive",
    });
  };

  if (configQuery.isLoading || (ready && hostAccessQuery.isLoading)) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (ready && hostChecked && hostAccessQuery.data === false) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Site access required</p>
        <p className="text-xs text-muted-foreground">
          Firefox needs permission for this extension to read your Linkwarden
          library. Without it, collections and links stay empty.
        </p>
        <Button type="button" onClick={() => void grantHostAccess()}>
          Allow access to all websites
        </Button>
        <p className="text-[11px] text-muted-foreground">
          This turns on “Access your data for all websites” for the extension
          (needed for your Linkwarden API). You can also enable it under
          about:addons → this extension → Permissions.
        </p>
      </div>
    );
  }

  if (canFetch && collectionsQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (canFetch && collectionsQuery.isError) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Couldn’t load collections</p>
        <p className="text-xs text-muted-foreground">
          {collectionsQuery.error instanceof Error
            ? collectionsQuery.error.message
            : "Check your URL, API key, and site access permission."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void grantHostAccess()}
          >
            Grant site access
          </Button>
          <Button
            type="button"
            onClick={() =>
              void queryClient.invalidateQueries({ queryKey: ["collections"] })
            }
          >
            Retry
          </Button>
        </div>
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
            selectMode={linkSelectMode}
            onSelectModeChange={setLinkSelectMode}
            selectedIds={selectedLinkIds}
            onSelectedIdsChange={setSelectedLinkIds}
            onDeleteLink={(link) => void handleDeleteLink(link)}
            onDeleteLinks={(links) => void handleDeleteLinks(links)}
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
                selectMode={linkSelectMode}
                onSelectModeChange={setLinkSelectMode}
                selectedIds={selectedLinkIds}
                onSelectedIdsChange={setSelectedLinkIds}
                onDeleteLink={(link) => void handleDeleteLink(link)}
                onDeleteLinks={(links) => void handleDeleteLinks(links)}
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
                selectMode={linkSelectMode}
                onSelectModeChange={setLinkSelectMode}
                selectedIds={selectedLinkIds}
                onSelectedIdsChange={setSelectedLinkIds}
                onDeleteLink={(link) => void handleDeleteLink(link)}
                onDeleteLinks={(links) => void handleDeleteLinks(links)}
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
