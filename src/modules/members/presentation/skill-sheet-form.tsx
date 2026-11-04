"use client";

import { ChevronDown, RotateCcw, Search, SearchX, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createSkillAssessmentsAction } from "@/modules/members/presentation/actions";
import { resolveSkillLevelDescription } from "@/modules/skills/domain/skill-level-guide";
import {
  getNextSkillSheetLevel,
  filterSkillSheetRows,
  getSkillLevelDefinitionText,
  getSkillSheetRowStatus,
  type SkillSheetRow
} from "@/modules/members/presentation/skill-sheet";
import { cn } from "@/shared/lib/utils";
import { ActionForm } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { SelectField } from "@/shared/ui/form-field";
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
  encouragement,
  initial = false,
  popularSkillIds = [],
  categoryGroups = [],
  popularHeading = "よく登録されているスキル"
}: {
  rows: SkillSheetRow[];
  levels: Array<{ level: number; description: string }>;
  encouragement: string;
  initial?: boolean;
  popularSkillIds?: string[];
  categoryGroups?: Array<{ id: string; name: string }>;
  popularHeading?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SkillSheetFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [selectedLevels, setSelectedLevels] = useState<Record<string, number>>(
    {}
  );
  // よく登録されているスキルがまだ無いときは、最初から全件を出す
  const [showAllSkills, setShowAllSkills] = useState(
    !initial || popularSkillIds.length === 0
  );
  const changedSkillIds = useMemo(
    () => new Set(Object.keys(selectedLevels)),
    [selectedLevels]
  );
  const changedCount = changedSkillIds.size;

  const filteredRows = useMemo(
    () =>
      filterSkillSheetRows(rows, { query, filter, categoryId, groupId, changedSkillIds })
        .filter((row) => showAllSkills || popularSkillIds.includes(row.skillId)),
    [categoryId, changedSkillIds, filter, groupId, popularSkillIds, query, rows, showAllSkills]
  );

  const groupOptions = categoryGroups;
  const hasUnclassified = rows.some((row) => row.groupId === null);
  const categoryOptions = useMemo(() => {
    // 大分類がないときは、今までどおり全カテゴリを選択欄に出す。
    const hasGroups = groupOptions.length > 0;
    if (hasGroups && groupId === "all") return [];
    const options = new Map<string, string>();
    rows
      .filter((row) =>
        !hasGroups ||
        (groupId === "unclassified" ? row.groupId === null : row.groupId === groupId)
      )
      .forEach((row) => options.set(row.categoryId, row.categoryName));
    return [...options].map(([id, name]) => ({ id, name }));
  }, [groupId, groupOptions.length, rows]);

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
      onSuccess={() => {
        setSelectedLevels({});
        if (initial) router.push("/dashboard");
      }}
    >
      <input type="hidden" name="assessments" value={JSON.stringify(payload)} />

      {initial ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">得意なスキルを3つ選びましょう</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">迷ったら「一人でできる」を目安に。あとから何度でも変えられます。</p>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5" aria-label="レベルの目安">
            {levels.map((level) => (
              <div key={level.level} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                <p className="font-semibold">Lv{level.level}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{level.description}</p>
              </div>
            ))}
          </div>
          <h3 className="text-base font-semibold">{popularHeading}</h3>
        </div>
      ) : (
        <p className="rounded-lg bg-[var(--primary-subtle)] px-4 py-3 text-sm font-medium leading-6 text-[var(--foreground)]">
          {encouragement}
        </p>
      )}

      {showAllSkills && groupOptions.length > 0 ? (
        <div className="space-y-3">
          <div role="tablist" aria-label="大分類" className="flex flex-wrap gap-1 border-b border-[var(--border)]">
            {[
              { id: "all", name: "すべて" },
              ...groupOptions,
              ...(hasUnclassified ? [{ id: "unclassified", name: "未分類" }] : [])
            ].map((group) => {
              const count = group.id === "all"
                ? rows.length
                : rows.filter((row) => group.id === "unclassified" ? row.groupId === null : row.groupId === group.id).length;
              return (
                <button key={group.id} type="button" role="tab" aria-selected={groupId === group.id}
                  onClick={() => { setGroupId(group.id); setCategoryId("all"); }}
                  className={cn(
                    "-mb-px inline-flex min-h-11 items-center gap-2 border-b-[3px] px-4 text-sm",
                    groupId === group.id
                      ? "border-[var(--primary)] font-semibold text-[var(--primary)]"
                      : "border-transparent text-[var(--muted-foreground)]"
                  )}
                >
                  {group.name}
                  <span className="text-xs font-normal text-[var(--muted-foreground)]">{count}</span>
                </button>
              );
            })}
          </div>
          {groupId !== "all" ? (
            <div role="group" aria-label="カテゴリ" className="flex flex-wrap gap-2">
              {[{ id: "all", name: "すべてのカテゴリ" }, ...categoryOptions].map((category) => (
                <button key={category.id} type="button" aria-pressed={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                  className={cn("min-h-11 rounded-full border px-4 text-sm font-semibold", categoryId === category.id ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--border-strong)]")}
                >{category.name}</button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showAllSkills ? <div
        className={cn(
          "grid gap-4 md:items-end",
          groupOptions.length > 0
            ? "md:grid-cols-[minmax(240px,1fr)_auto]"
            : "md:grid-cols-[minmax(240px,1fr)_minmax(180px,0.6fr)_auto]"
        )}
      >
        <div>
          <label htmlFor="skill-sheet-search" className="sr-only">
            スキルを検索
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              id="skill-sheet-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="スキルを検索"
              className="w-full pl-9"
            />
          </div>
        </div>

        {groupOptions.length === 0 ? (
          <SelectField
            id="skill-sheet-category"
            label="カテゴリ"
            labelClassName="sr-only"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="all">すべてのカテゴリ</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </SelectField>
        ) : null}

        <div>
          <span className="sr-only">
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
      </div> : null}

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
                  {category.rows[0]?.groupName ? (
                    <span className="mr-2 text-xs font-medium text-[var(--muted-foreground)]">{category.rows[0].groupName} /</span>
                  ) : null}
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
                  const rejectionReasonId = `skill-rejection-reason-${row.skillId}`;

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
                        {row.isRejected ? (
                          <div className="mt-2 space-y-1">
                            <Badge variant="danger">差し戻し</Badge>
                            <p
                              id={rejectionReasonId}
                              title={row.rejectionReason ?? undefined}
                              className="line-clamp-2 text-xs leading-5 text-[var(--destructive)]"
                            >
                              {row.rejectionReason
                                ? `差し戻しの理由：${row.rejectionReason}`
                                : "差し戻しの理由はありません。"}
                            </p>
                          </div>
                        ) : null}
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
                          aria-describedby={[
                            definitionId,
                            row.pendingLevel === null ? null : pendingReasonId,
                            row.isRejected ? rejectionReasonId : null
                          ]
                            .filter(Boolean)
                            .join(" ")}
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
                                aria-label={`Lv${level}`}
                                onClick={() => selectLevel(row, level)}
                                className={cn(
                                  "h-11 w-11 rounded-md border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                  isRequested
                                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                                    : isCurrent
                                      ? "border-2 border-[var(--primary)] bg-[var(--primary-subtle)] font-bold text-[var(--primary)] ring-2 ring-[var(--ring)]/30"
                                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
                                )}
                              >
                                {level}
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
                            : resolveSkillLevelDescription(
                                displayedLevel,
                                levels,
                                row.levelGuides
                              )
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

      {initial && !showAllSkills ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between"
          onClick={() => setShowAllSkills(true)}
        >
          ほかのスキルを探す（全 {rows.length}件）
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}

      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--foreground)]" aria-live="polite">
          {initial
            ? `${changedCount}件を選んでいます${payload.length > 0 ? `（${payload.slice(0, 2).map((item) => `${rows.find((row) => row.skillId === item.skillId)?.skillName} Lv${item.requestedLevel}`).join("・")}${payload.length > 2 ? "・…" : ""}）` : ""}`
            : `${changedCount}件のスキルを変更しています`}
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
            {initial ? "上司に申請する" : `${changedCount}件を申請`}
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
