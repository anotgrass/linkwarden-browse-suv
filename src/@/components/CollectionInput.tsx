import { useEffect, useMemo, useState } from "react";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { Search, X } from "lucide-react";
import { Button } from "./ui/Button.tsx";
import { FormControl } from "./ui/Form.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/Popover.tsx";
import { Collection } from "../lib/actions/collections.ts";
import CollectionDrillDown from "./CollectionDrillDown.tsx";

type Props = {
  value?: { id?: number; ownerId?: number; name: string };
  onChange: (collection: {
    id?: number;
    ownerId?: number;
    name: string;
  }) => void;
  collections: Collection[] | undefined;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullScreen: boolean;
};

export default function CollectionInput({
  value,
  onChange,
  collections,
  isLoading,
  open,
  onOpenChange,
  fullScreen,
}: Props) {
  const [search, setSearch] = useState("");
  const [path, setPath] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPath([]);
    }
  }, [open]);

  const list = Array.isArray(collections) ? collections : [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return list.filter((c) => c.name.toLowerCase().includes(query));
  }, [search, list]);

  const handleSelect = (collection: Collection) => {
    onChange({
      id: collection.id,
      ownerId: collection.ownerId,
      name: collection.name,
    });
    onOpenChange(false);
  };

  const picker = (
    <div
      className={`flex h-full w-full flex-col bg-popover text-popover-foreground ${
        fullScreen ? "rounded-none" : "rounded-md"
      }`}
    >
      <div className="flex items-center border-b px-3 shrink-0">
        <Search aria-hidden className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          autoFocus={fullScreen}
          className="flex h-11 w-full min-w-[280px] bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Search Collection..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="w-full text-center my-auto py-6">Loading...</p>
      ) : search.trim() ? (
        filtered.length === 0 ? (
          <p className="py-6 text-center text-sm">No Collection found.</p>
        ) : (
          <div className="w-full overflow-y-auto p-1 text-foreground flex-1">
            {filtered.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => handleSelect(collection)}
                className="relative flex w-full cursor-pointer select-none flex-col items-start justify-start rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
              >
                <p>{collection.name}</p>
                <p className="text-xs text-neutral-500">
                  {collection.pathname}
                </p>
              </button>
            ))}
          </div>
        )
      ) : (
        <CollectionDrillDown
          collections={list}
          path={path}
          onPathChange={setPath}
          mode="select"
          onSelect={handleSelect}
          className="border-0 rounded-none flex-1 min-h-0"
          listClassName="max-h-[280px]"
        />
      )}
    </div>
  );

  return (
    <div className="min-w-full">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              type="button"
              aria-haspopup={fullScreen ? "dialog" : "listbox"}
              aria-expanded={open}
              className="w-full justify-between"
            >
              {isLoading
                ? "Unorganized"
                : value?.name || "Select a collection..."}
              <CaretSortIcon
                aria-hidden
                className="ml-2 h-4 w-4 shrink-0 opacity-50"
              />
            </Button>
          </FormControl>
        </PopoverTrigger>

        {open &&
          (fullScreen ? (
            <div
              role="dialog"
              aria-modal
              aria-label="Select a collection"
              className="fade-up fixed inset-0 z-50 h-full w-full bg-popover"
            >
              <Button
                type="button"
                aria-label="Close"
                className="absolute top-1 right-1 bg-transparent hover:bg-transparent hover:opacity-50 transition-colors ease-in-out duration-200"
                onClick={() => onOpenChange(false)}
              >
                <X aria-hidden className="h-4 w-4 text-black dark:text-white" />
              </Button>
              {picker}
            </div>
          ) : (
            <PopoverContent className="panel min-w-full h-[320px] p-0 overflow-hidden">
              {picker}
            </PopoverContent>
          ))}
      </Popover>
    </div>
  );
}
