import { useEffect, useRef, useState } from "react";
import { type Resort } from "@/services/resortService";

interface ResortSearchDropdownProps {
  results: Resort[];
  isVisible: boolean;
  onSelect: (resort: Resort) => void;
  onClose?: () => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

export function ResortSearchDropdown({
  results,
  isVisible,
  onSelect,
  onClose,
  activeIndex = -1,
  onActiveIndexChange,
}: ResortSearchDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [internalActiveIndex, setInternalActiveIndex] = useState(activeIndex);

  useEffect(() => {
    setInternalActiveIndex(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!results.length) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          const nextIndex = internalActiveIndex < results.length - 1 ? internalActiveIndex + 1 : 0;
          setInternalActiveIndex(nextIndex);
          onActiveIndexChange?.(nextIndex);
          scrollToItem(nextIndex);
          break;
        case "ArrowUp":
          e.preventDefault();
          const prevIndex = internalActiveIndex > 0 ? internalActiveIndex - 1 : results.length - 1;
          setInternalActiveIndex(prevIndex);
          onActiveIndexChange?.(prevIndex);
          scrollToItem(prevIndex);
          break;
        case "Enter":
          e.preventDefault();
          if (internalActiveIndex >= 0 && internalActiveIndex < results.length) {
            onSelect(results[internalActiveIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose?.();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, results, internalActiveIndex, onSelect, onClose, onActiveIndexChange]);

  const scrollToItem = (index: number) => {
    if (!dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll("button");
    items[index]?.scrollIntoView({ block: "nearest" });
  };

  if (!isVisible || results.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
      data-testid="resort-search-results"
      role="listbox"
    >
      {results.map((resort, index) => (
        <button
          key={resort.id}
          type="button"
          className={`block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 ${
            index === internalActiveIndex ? "bg-slate-100" : ""
          }`}
          onClick={() => onSelect(resort)}
          onMouseEnter={() => {
            setInternalActiveIndex(index);
            onActiveIndexChange?.(index);
          }}
          data-testid={`resort-option-${resort.name.toLowerCase().replace(/[\s']/g, '-').replace(/[^\w-]/g, '')}`}
          role="option"
        >
          {resort.name}{" "}
          <span className="text-xs text-slate-400">
            ({resort.region}, {resort.country})
          </span>
        </button>
      ))}
    </div>
  );
}