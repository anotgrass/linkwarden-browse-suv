import { cn } from "../lib/utils.ts";

type Item<T extends string> = {
  id: T;
  label: string;
};

export default function NavSegment<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: Item<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("nav-segment", className)} role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          data-active={value === item.id}
          className="nav-segment-item"
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
