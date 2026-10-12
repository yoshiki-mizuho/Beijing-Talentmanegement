"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/shared/lib/utils";
import { Combobox } from "@/shared/ui/combobox";
import type { ComboboxOption } from "@/shared/ui/combobox-filter";

export function PeopleSearchFilters({
  options,
  selectedSkill,
  level,
  children
}: {
  options: ComboboxOption[];
  selectedSkill: string | null;
  level: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const latestSkill = useRef(selectedSkill);
  const latestLevel = useRef(level);

  useEffect(() => {
    latestSkill.current = selectedSkill;
    latestLevel.current = level;
  }, [level, selectedSkill]);

  function updateFilters(skill: string | null, minimumLevel: number) {
    latestSkill.current = skill;
    latestLevel.current = minimumLevel;
    const params = new URLSearchParams();
    if (skill) params.set("skill", skill);
    params.set("level", String(minimumLevel));
    startTransition(() => {
      router.replace(`/explore?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <>
      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
        <Combobox
          id="explore-skill"
          label="探すスキル"
          options={options}
          value={selectedSkill}
          onChange={(skill) => updateFilters(skill, latestLevel.current)}
          placeholder="スキル名を入力"
          className="sm:max-w-sm sm:flex-1"
        />
        <fieldset className="min-w-0">
          <legend className="text-sm font-medium text-slate-700">最低レベル</legend>
          <div
            className="mt-1 flex max-w-full gap-1 overflow-x-auto"
            role="group"
            aria-label="最低レベル"
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Lv${value}以上`}
                aria-pressed={level === value}
                className={cn(
                  "min-h-11 min-w-11 shrink-0 rounded-full border px-3 text-sm font-medium",
                  level === value
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                )}
                onClick={() => updateFilters(latestSkill.current, value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div
        className={cn("mt-5 transition-opacity", isPending ? "opacity-50" : undefined)}
        aria-busy={isPending}
      >
        {children}
      </div>
    </>
  );
}
