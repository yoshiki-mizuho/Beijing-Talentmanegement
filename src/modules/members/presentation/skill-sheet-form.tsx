"use client";

import { RotateCcw, Search, SearchX, Send } from "lucide-react";
import { useMemo, useState } from "react";

import { createSkillAssessmentsAction } from "@/modules/members/presentation/actions";
import {
  getNextSkillSheetLevel,
  getSkillLevelDefinitionText,
  getSkillSheetRowStatus,
  type SkillSheetRow
} from "@/modules/members/presentation/skill-sheet";
import { cn } from "@/shared/lib/utils";
import { ActionForm } from "@/shared/ui/action-form";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SubmitButton } from "@/shared/ui/submit-button";

type SkillSheetFilter = "all" | "unowned" | "changed";

const filters: Array<{ value: SkillSheetFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "unowned", label: "未保有のみ" },
  { value: "changed", label: "変更した行" }
];

export function SkillSheetForm({
  rows,
  levels,
  encouragement
}: {
  rows: SkillSheetRow[];
  levels: Array<{ level: number; description: string }>;
  encouragement: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SkillSheetFilter>("all");
  const [selectedLevels, setSelectedLevels] = useState<Record<string, number>>(
    {}
  );
  const levelDescriptions = useMemo(
    () => new Map(levels.map((level) => [level.level, level.description])),
    [levels]
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("ja");
  const changedSkillIds = useMemo(
    () => new Set(Object.keys(selectedLevels)),
    [selectedLevels]
  );
  const changedCount = changedSkillIds.size;

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          row.skillName.toLocaleLowerCase("ja").includes(normalizedQuery);
        const matchesFilter =
          filter === "all" ||
          (filter === "unowned" && row.currentLevel === null) ||
          (filter === "changed" && changedSkillIds.has(row.skillId));

        return matchesQuery && matchesFilter;
      }),
    [changedSkillIds, filter, normalizedQuery, rows]
  );

  const categories = useMemo(() => {
    const grouped = new Map<
      string,
      { id: string; name: string; rows: SkillSheetRow[] }
    >();

    for (const row of filteredRows) {
      const category = grouped.get(row.categoryId);
      if (category) {
        category.rows.push(row);
      } else {
        grouped.set(row.categoryId, {
          id: row.categoryId,
          name: row.categoryName,
          rows: [row]
        });
      }
    }

    return [...grouped.values()];
  }, [filteredRows]);

  const payload = rows.flatMap((row) => {
    const selectedLevel = selectedLevels[row.skillId];
    return selectedLevel === undefined
      ? []
      : [{ skillId: row.skillId, requestedLevel: selectedLevel }];
  });

  function selectLevel(row: SkillSheetRow, clickedLevel: number) {
    if (row.pendingLevel !== null) return;

    setSelectedLevels((current) => {
      const selectedLevel = current[row.skillId] ?? null;
      const nextLevel = getNextSkillSheetLevel(
        row.currentLevel,
        selectedLevel,
        clickedLevel
      );
      const next = { ...current };

      if (nextLevel === null) {
        delete next[row.skillId];
      } else {
        next[row.skillId] = nextLevel;
      }

      return next;
    });
  }

  return (
    <ActionForm
      action={createSkillAssessmentsAction}
      className="space-y-5"
      onSuccess={() => setSelectedLevels({})}
    >
      <input type="hidden" name="assessments" value={JSON.stringify(payload)} />

      <p className="rounded-lg bg-[var(--primary-subtle)] px-4 py-3 text-sm font-medium leading-6 text-[var(--foreground)]">
        {encouragement}
      </p>

      <div className="grid gap-4 md:grid-cols-[minmax(240px,1fr)_auto] md:items-end">
        <div>
          <Label htmlFor="skill-sheet-search">スキルを検索</Label>
          <div className="relative mt-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              id="skill-sheet-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="スキル名で絞り込み"
              className="w-full pl-9"
            />
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-[var(--foreground)]">
            表示するスキル
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="表示するスキル">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
                  filter === item.value
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)]">
          <EmptyState
            icon={SearchX}
            title="条件に合うスキルがありません"
            description="検索語や表示フィルタを変えて、もう一度お試しください。"
          />
        </div>
      ) : (
        <div className="space-y-5">
          {categories.map((category) => (
            <section
              key={category.id}
              aria-labelledby={`skill-category-${category.id}`}
              className="overflow-hidden rounded-lg border border-[var(--border)]"
            >
              <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
                <h3
                  id={`skill-category-${category.id}`}
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  {category.name}
                </h3>
              </div>
              <div role="list">
                {category.rows.map((row) => {
                  const selectedLevel = selectedLevels[row.skillId] ?? null;
                  const displayedLevel = selectedLevel ?? row.currentLevel;
                  const isChanged = selectedLevel !== null;
                  const definitionId = `skill-definition-${row.skillId}`;
                  const pendingReasonId = `skill-pending-reason-${row.skillId}`;

                  return (
                    <div
                      key={row.skillId}
                      role="listitem"
                      className={cn(
                        "grid gap-4 border-l-4 border-b border-b-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1fr)_minmax(220px,1.1fr)] md:items-center",
                        isChanged
                          ? "border-l-[var(--primary)] bg-[var(--primary-subtle)]"
                          : "border-l-transparent bg-[var(--surface)]"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {row.skillName}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
                          {getSkillSheetRowStatus(row).map((status) => (
                            <span
                              key={status}
                              className={cn(
                                status.startsWith("承認待ち") &&
                                  "font-semibold text-amber-800"
                              )}
                            >
                              {status}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div
                          role="group"
                          aria-label={`${row.skillName}のレベル`}
                          aria-describedby={
                            row.pendingLevel === null
                              ? definitionId
                              : `${definitionId} ${pendingReasonId}`
                          }
                          className="flex flex-wrap gap-2"
                        >
                          {levels.map(({ level }) => {
                            const isCurrent = row.currentLevel === level;
                            const isSelected = displayedLevel === level;
                            const isRequested = selectedLevel === level;

                            return (
                              <button
                                key={level}
                                type="button"
                                disabled={row.pendingLevel !== null}
                                aria-pressed={isSelected}
                                aria-label={`${row.skillName} レベル${level}`}
                                onClick={() => selectLevel(row, level)}
                                className={cn(
                                  "h-11 w-11 rounded-md border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                  isRequested
                                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                                    : isCurrent
                                      ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                                )}
                              >
                                Lv{level}
                              </button>
                            );
                          })}
                        </div>
                        {row.pendingLevel !== null ? (
                          <p
                            id={pendingReasonId}
                            className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]"
                          >
                            マネージャーの確認が終わるまで、もう一度は申請できません。
                          </p>
                        ) : null}
                      </div>

                      <p
                        id={definitionId}
                        className="text-sm leading-6 text-[var(--muted-foreground)]"
                        aria-live="polite"
                      >
                        {getSkillLevelDefinitionText(
                          row.currentLevel,
                          selectedLevel,
                          displayedLevel === null
                            ? undefined
                            : levelDescriptions.get(displayedLevel)
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]" aria-live="polite">
          {changedCount}件のスキルを変更しています
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedLevels({})}
            disabled={changedCount === 0}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            取り消す
          </Button>
          <SubmitButton
            pendingLabel="申請中…"
            disabled={changedCount === 0}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {changedCount}件を申請
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
