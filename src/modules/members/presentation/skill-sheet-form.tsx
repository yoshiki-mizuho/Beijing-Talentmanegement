"use client";

import { ChevronDown, Clock, MessageSquare, RotateCcw, Search, SearchX, Send, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { createSkillAssessmentsAction } from "@/modules/members/presentation/actions";
import { resolveSkillLevelDescription } from "@/modules/skills/domain/skill-level-guide";
import {
  getNextSkillSheetLevel,
  buildLevelGuideWindow,
  countSkillSheetFilters,
  filterSkillSheetRows,
  getSkillSheetRowStatus,
  isNewSkill,
  isSkillSheetFilterDisabled,
  isStaleSkill,
  type SkillSheetFilter,
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
import { Tooltip } from "@/shared/ui/tooltip";

const filters: Array<{ value: SkillSheetFilter; label: string }> = [
  { value: "all", label: "すべて" },
  { value: "new", label: "新着" },
  { value: "target", label: "目標ロールに必要" },
  { value: "popular", label: "部署でよく登録" },
  { value: "stale", label: "しばらく申請なし" },
  { value: "unowned", label: "未登録" },
  { value: "changed", label: "変更あり" }
];

export function SkillSheetForm({
  rows,
  levels,
  encouragement,
  initial = false,
  popularSkillIds = [],
  categoryGroups = [],
  initialFilter = "all",
  initialQuery = "",
  popularHeading = "よく登録されているスキル"
}: {
  rows: SkillSheetRow[];
  levels: Array<{ level: number; description: string }>;
  encouragement: string;
  initial?: boolean;
  popularSkillIds?: string[];
  categoryGroups?: Array<{ id: string; name: string }>;
  initialFilter?: SkillSheetFilter;
  initialQuery?: string;
  popularHeading?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SkillSheetFilter>(initialFilter);
  const [categoryId, setCategoryId] = useState("all");
  const [groupId, setGroupId] = useState("all");
  const [selectedLevels, setSelectedLevels] = useState<Record<string, number>>(
    {}
  );
  const [comments, setComments] = useState<Record<string, string>>({});
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [showInitialLevelGuides, setShowInitialLevelGuides] = useState(false);
  // よく登録されているスキルがまだ無いときは、最初から全件を出す
  const [showAllSkills, setShowAllSkills] = useState(
    !initial || popularSkillIds.length === 0 || initialFilter !== "all"
  );
  const changedSkillIds = useMemo(
    () => new Set(Object.keys(selectedLevels)),
    [selectedLevels]
  );
  const changedCount = changedSkillIds.size;
  const popularSkillIdSet = useMemo(
    () => new Set(popularSkillIds),
    [popularSkillIds]
  );

  const filteredRows = useMemo(
    () =>
      filterSkillSheetRows(rows, {
        query,
        filter,
        categoryId,
        groupId,
        changedSkillIds,
        popularSkillIds: popularSkillIdSet
      })
        .filter((row) => showAllSkills || popularSkillIdSet.has(row.skillId)),
    [categoryId, changedSkillIds, filter, groupId, popularSkillIdSet, query, rows, showAllSkills]
  );
  const filterCounts = useMemo(
    () => countSkillSheetFilters(rows, {
      categoryId,
      groupId,
      changedSkillIds,
      popularSkillIds: popularSkillIdSet
    }),
    [categoryId, changedSkillIds, groupId, popularSkillIdSet, rows]
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
  const activeRow = rows.find((row) => row.skillId === activeSkillId) ?? null;
  const activeSelectedLevel = activeRow
    ? selectedLevels[activeRow.skillId] ?? null
    : null;
  const levelGuideWindow = activeRow
    ? buildLevelGuideWindow(
        activeSelectedLevel,
        activeRow.pendingLevel,
        activeRow.currentLevel
      )
    : null;

  const payload = rows.flatMap((row) => {
    const selectedLevel = selectedLevels[row.skillId];
    return selectedLevel === undefined
      ? []
      : [{
          skillId: row.skillId,
          requestedLevel: selectedLevel,
          applicantComment: comments[row.skillId] ?? null
        }];
  });

  useEffect(() => {
    toast.dismiss();
  }, []);

  function selectLevel(row: SkillSheetRow, clickedLevel: number) {
    if (row.pendingLevel !== null) return;

    setActiveSkillId(row.skillId);
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
        setComments((currentComments) => {
          const nextComments = { ...currentComments };
          delete nextComments[row.skillId];
          return nextComments;
        });
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
        setComments({});
        setActiveSkillId(null);
        if (initial) router.push("/dashboard");
      }}
    >
      <input type="hidden" name="assessments" value={JSON.stringify(payload)} />

      {initial ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">得意なスキルを3つ選びましょう</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">迷ったら Lv2（一人でできる）を目安に。あとから何度でも変えられます。</p>
          </div>
          <button
            type="button"
            aria-expanded={showInitialLevelGuides}
            onClick={() => setShowInitialLevelGuides((current) => !current)}
            className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--primary)] md:hidden"
          >
            レベルの目安を見る
            <ChevronDown
              className={cn("h-4 w-4", showInitialLevelGuides && "rotate-180")}
              aria-hidden="true"
            />
          </button>
          <div
            className={cn(
              "grid-cols-2 gap-2 md:grid md:grid-cols-5",
              showInitialLevelGuides ? "grid" : "hidden"
            )}
            aria-label="レベルの目安"
          >
            {levels.map((level) => (
              <div key={level.level} className="rounded-lg border border-[var(--border)] p-3 text-sm">
                <p className="font-semibold">Lv{level.level}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{level.description}</p>
              </div>
            ))}
          </div>
          {!showAllSkills ? (
            <h3 className="text-base font-semibold">{popularHeading}</h3>
          ) : null}
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
                  {rows.some((row) =>
                    isNewSkill(row.createdAt) &&
                    (group.id === "all" ||
                      (group.id === "unclassified"
                        ? row.groupId === null
                        : row.groupId === group.id))
                  ) ? (
                    <Badge variant="primary">
                      新着 {rows.filter((row) =>
                        isNewSkill(row.createdAt) &&
                        (group.id === "all" ||
                          (group.id === "unclassified"
                            ? row.groupId === null
                            : row.groupId === group.id))
                      ).length}
                    </Badge>
                  ) : null}
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
            {filters.map((item) => {
              const disabled = isSkillSheetFilterDisabled(
                filterCounts[item.value],
                filter === item.value
              );
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={filter === item.value}
                  disabled={disabled}
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
                    filter === item.value
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]",
                    disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  {item.label} {filterCounts[item.value]}
                </button>
              );
            })}
          </div>
        </div>
      </div> : null}

      <div className={cn(!initial && "grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start")}>
      {!initial ? (
        <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4" aria-label="レベルの目安">
          {activeRow && levelGuideWindow ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">{activeRow.skillName}のレベルの目安</h2>
              {levelGuideWindow.levels.map((level) => {
                const labels = [
                  activeSelectedLevel === level ? "申請するレベル" : null,
                  activeRow.pendingLevel === level ? "承認待ちのレベル" : null,
                  activeRow.currentLevel === level ? "いまのレベル" : null
                ].filter(Boolean);
                return (
                  <div
                    key={level}
                    className={cn(
                      "flex gap-3 rounded-lg border p-3",
                      level === levelGuideWindow.baseLevel
                        ? "border-[var(--primary)] bg-[var(--primary-subtle)]"
                        : "border-[var(--border)]"
                    )}
                  >
                    <span
                      aria-label={`Lv${level}`}
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-md text-sm font-bold",
                        level === levelGuideWindow.baseLevel
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)]"
                      )}
                    >
                      {level}
                    </span>
                    <div>
                      {labels.length > 0 ? (
                        <p className="mb-1 text-xs font-semibold text-[var(--primary)]">
                          {labels.join("・")}
                        </p>
                      ) : null}
                      <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                        {resolveSkillLevelDescription(level, levels, activeRow.levelGuides) ??
                          "レベル定義が登録されていません。"}
                      </p>
                    </div>
                  </div>
                );
              })}
              {activeSelectedLevel !== null ? (
                <div>
                  <label htmlFor="skill-applicant-comment" className="text-sm font-semibold">
                    ひとこと（任意）
                  </label>
                  <textarea
                    id="skill-applicant-comment"
                    value={comments[activeRow.skillId] ?? ""}
                    maxLength={200}
                    rows={3}
                    placeholder="例：案件Xで設計から担当しました"
                    onChange={(event) => setComments((current) => ({
                      ...current,
                      [activeRow.skillId]: event.target.value
                    }))}
                    className="mt-2 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  />
                  <p className="mt-1 text-right text-xs text-[var(--muted-foreground)]">
                    {(comments[activeRow.skillId] ?? "").length} / 200
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              スキルを選ぶと、レベルの目安が出ます
            </p>
          )}
        </aside>
      ) : null}

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] lg:col-start-1 lg:row-start-1">
          <EmptyState
            icon={SearchX}
            title="条件に合うスキルがありません"
            description="検索語や表示フィルタを変えて、もう一度お試しください。"
          />
        </div>
      ) : (
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
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
                  const pendingReasonId = `skill-pending-reason-${row.skillId}`;
                  const rejectionReasonId = `skill-rejection-reason-${row.skillId}`;

                  return (
                    <div
                      key={row.skillId}
                      role="listitem"
                      className={cn(
                        "grid gap-4 border-l-4 border-b border-b-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[minmax(180px,0.8fr)_minmax(260px,1fr)] md:items-center",
                        isChanged || activeSkillId === row.skillId
                          ? "border-l-[var(--primary)] bg-[var(--primary-subtle)]"
                          : "border-l-transparent bg-[var(--surface)]"
                      )}
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setActiveSkillId(row.skillId)}
                          className="text-left text-sm font-semibold text-[var(--foreground)] hover:text-[var(--primary)]"
                        >
                          {row.skillName}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {isNewSkill(row.createdAt) ? (
                            <Tooltip content="30日以内に追加されたスキル">
                              <button type="button" aria-label="30日以内に追加されたスキル" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                                <Badge variant="primary">NEW</Badge>
                              </button>
                            </Tooltip>
                          ) : null}
                          {row.targetLevel !== null ? (
                            <Tooltip content={`目標ロールに必要なスキル（Lv${row.targetLevel}）`}>
                              <button type="button" aria-label={`目標ロールに必要なスキル（Lv${row.targetLevel}）`} className="rounded p-1 text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                                <Target className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </Tooltip>
                          ) : null}
                          {isStaleSkill(row) ? (
                            <Tooltip content="半年以上申請していません。見直してみませんか">
                              <button type="button" aria-label="半年以上申請していません。見直してみませんか" className="rounded p-1 text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                                <Clock className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </Tooltip>
                          ) : null}
                          {(comments[row.skillId] ?? "").trim() ? (
                            <Tooltip content="ひとことを書いています">
                              <button type="button" aria-label="ひとことを書いています" className="rounded p-1 text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </Tooltip>
                          ) : null}
                        </div>
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
                                row.pendingLevel !== null &&
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

                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      </div>

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
            onClick={() => {
              setSelectedLevels({});
              setComments({});
              setActiveSkillId(null);
            }}
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
