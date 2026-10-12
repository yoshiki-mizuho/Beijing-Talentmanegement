"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { filterComboboxOptions, type ComboboxOption } from "@/shared/ui/combobox-filter";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type ComboboxProps = {
  id: string;
  label: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
};

export function Combobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  emptyText = "該当するものがありません",
  className
}: ComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef(new Map<string, HTMLLIElement>());
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => filterComboboxOptions(options, query), [options, query]);
  const listboxId = `${id}-listbox`;
  const activeOption = filteredOptions[activeIndex];

  useEffect(() => {
    // URL 遷移などで controlled value が変わった場合、編集中の表示も選択値へ同期する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption?.label, value]);

  const selectedLabelRef = useRef(selectedOption?.label ?? "");
  useEffect(() => {
    selectedLabelRef.current = selectedOption?.label ?? "";
  }, [selectedOption?.label]);

  useEffect(() => {
    // 外側を押して閉じたときは、入力途中の文字を捨てて選択中の表示に戻す
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
      setQuery(selectedLabelRef.current);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!activeOption) return;
    optionRefs.current.get(activeOption.value)?.scrollIntoView({ block: "nearest" });
  }, [activeOption]);

  function openList() {
    setIsOpen(true);
    const selectedIndex = filteredOptions.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : filteredOptions.length ? 0 : -1);
  }

  function selectOption(option: ComboboxOption) {
    setQuery(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(option.value);
  }

  function resetInput() {
    setQuery(selectedOption?.label ?? "");
    setIsOpen(false);
    setActiveIndex(-1);
  }

  const groups = filteredOptions.reduce<Array<{ name?: string; options: ComboboxOption[] }>>(
    (result, option) => {
      const existing = result.find((group) => group.name === option.group);
      if (existing) existing.options.push(option);
      else result.push({ name: option.group, options: [option] });
      return result;
    },
    []
  );

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input
          id={id}
          role="combobox"
          value={query}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && activeOption ? `${id}-option-${activeOption.value}` : undefined
          }
          autoComplete="off"
          className={cn("w-full", value ? "pr-11" : undefined)}
          onFocus={openList}
          onClick={openList}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (!isOpen) {
                openList();
                return;
              }
              const offset = event.key === "ArrowDown" ? 1 : -1;
              setActiveIndex((current) =>
                Math.min(Math.max(current + offset, 0), filteredOptions.length - 1)
              );
            } else if (event.key === "Enter" && isOpen && activeOption) {
              event.preventDefault();
              selectOption(activeOption);
            } else if (event.key === "Escape") {
              event.preventDefault();
              resetInput();
            } else if (event.key === "Tab") {
              setIsOpen(false);
            }
          }}
        />
        {value ? (
          <button
            type="button"
            aria-label="選択を解除"
            className="absolute right-0 top-0 grid h-10 w-11 place-items-center rounded-r-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              setActiveIndex(-1);
              onChange(null);
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-lg"
        >
          {groups.length ? (
            groups.map((group, groupIndex) => {
              const groupId = `${id}-group-${groupIndex}`;
              return (
                <li
                  key={group.name ?? "ungrouped"}
                  role="group"
                  aria-labelledby={group.name ? groupId : undefined}
                >
                  {group.name ? (
                    <div
                      id={groupId}
                      className="px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]"
                    >
                      {group.name}
                    </div>
                  ) : null}
                  <ul>
                    {group.options.map((option) => {
                      const optionIndex = filteredOptions.indexOf(option);
                      return (
                        <li
                          key={option.value}
                          id={`${id}-option-${option.value}`}
                          ref={(node) => {
                            if (node) optionRefs.current.set(option.value, node);
                            else optionRefs.current.delete(option.value);
                          }}
                          role="option"
                          aria-selected={option.value === value}
                          className={cn(
                            "cursor-pointer px-3 py-2 text-sm",
                            optionIndex === activeIndex
                              ? "bg-[var(--primary-light)] text-[var(--foreground)]"
                              : "hover:bg-[var(--surface-subtle)]",
                            option.value === value
                              ? "font-semibold text-[var(--primary)]"
                              : undefined
                          )}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectOption(option);
                          }}
                        >
                          {option.label}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-3 text-sm text-[var(--muted-foreground)]">{emptyText}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
