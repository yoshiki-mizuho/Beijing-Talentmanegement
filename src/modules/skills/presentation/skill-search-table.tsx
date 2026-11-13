"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type Row, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  closestCorners,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deactivateSkillAction,
  deleteSkillAction,
  reorderSkillsAction,
  updateSkillAction
} from "@/modules/skills/presentation/actions";
import {
  buildSkillOrder,
  categoryKey,
  containerKey,
  findCategoryId,
  moveCategoryOrder,
  moveSkillOrder,
  skillKey,
  toSkillOrderPayload,
  type SkillOrderCategory
} from "./skill-reorder-order";
import { SkillLevelGuideFields } from "./skill-level-guide-fields";
import {
  buildSkillSearchParams,
  emptySkillSearchFilters,
  type SkillSearchFilters
} from "@/modules/skills/presentation/skill-search-params";
import { calculateAverageSkillLevel } from "@/modules/skills/domain/skill-statistics";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { QueryProvider } from "@/shared/ui/query-provider";
import { SubmitButton } from "@/shared/ui/submit-button";

export type SkillRow = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  category: {
    id: string;
    name: string;
  };
  _count: {
    memberSkills: number;
    selfAssessments: number;
    skillLevelChanges: number;
    cheers: number;
    roleRequirements: number;
  };
  memberSkills: { level: number }[];
  levelGuides: Array<{ level: number; description: string }>;
  isDeletable: boolean;
  reason: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

type LevelOption = {
  level: number;
  description: string;
};

export function SkillSearchTable(props: {
  initialSkills: SkillRow[];
  categories: CategoryOption[];
  levels: LevelOption[];
  canManage: boolean;
}) {
  return (
    <QueryProvider>
      <SkillSearchTableInner {...props} />
    </QueryProvider>
  );
}

function SkillSearchTableInner({
  initialSkills,
  categories,
  levels,
  canManage
}: {
  initialSkills: SkillRow[];
  categories: CategoryOption[];
  levels: LevelOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SkillSearchFilters>(emptySkillSearchFilters);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const initialOrder = useMemo(
    () => buildSkillOrder(categories, initialSkills),
    [categories, initialSkills]
  );
  const [order, setOrder] = useState<SkillOrderCategory[]>(initialOrder);
  const orderRef = useRef(order);
  const dragStartOrder = useRef<SkillOrderCategory[] | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewCategory = useRef(false);
  const [savingOrder, startSavingOrder] = useTransition();
  const reducedMotion = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const query = useQuery({
    queryKey: ["skills", filters],
    queryFn: () => fetchSkills(filters),
    initialData:
      filters.q === emptySkillSearchFilters.q &&
      filters.categoryId === emptySkillSearchFilters.categoryId &&
      filters.isActive === emptySkillSearchFilters.isActive
        ? initialSkills.filter((skill) => skill.isActive)
        : undefined,
    placeholderData: keepPreviousData
  });
  const rows = query.data ?? [];
  const hasNonInitialConditions =
    filters.q !== emptySkillSearchFilters.q ||
    filters.categoryId !== emptySkillSearchFilters.categoryId ||
    filters.isActive !== emptySkillSearchFilters.isActive;
  // 編集中のスキルは一覧の最新のデータから引く。保存直後に開き直しても、再取得が届いたら最新の内容に置き換わる
  const editingSkill = rows.find((skill) => skill.id === editingSkillId) ?? null;
  const reorderDisabled = savingOrder || filters.q.trim() !== "" || filters.categoryId !== "";
  const reorderTitle =
    filters.q.trim() !== "" || filters.categoryId !== ""
      ? "絞り込みを解除すると並び替えられます"
      : undefined;

  // 追加・編集の後にサーバーの一覧が変わったら、表示中の検索結果も取り直す
  useEffect(() => {
    queryClient.setQueryData(
      ["skills", emptySkillSearchFilters],
      initialSkills.filter((skill) => skill.isActive)
    );
    void queryClient.invalidateQueries({ queryKey: ["skills"] });
  }, [initialSkills, queryClient]);

  useEffect(() => {
    orderRef.current = initialOrder;
    setOrder(initialOrder);
  }, [initialOrder]);

  // 並びが変わって描き直されたら、次の判定から通常どおりに戻す
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      recentlyMovedToNewCategory.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [order]);

  const columns = useMemo<ColumnDef<SkillRow>[]>(() => {
    const definitions: ColumnDef<SkillRow>[] = [
      {
        accessorKey: "name",
        header: "スキル名",
        cell: ({ row }) => (
          <span className="block max-w-56 break-words font-semibold text-[var(--foreground)]">
            {row.original.name}
          </span>
        )
      },
      {
        id: "averageLevel",
        header: "平均レベル",
        cell: ({ row }) => (
          <AverageLevel value={calculateAverageSkillLevel(row.original.memberSkills)} />
        )
      },
      {
        id: "memberSkillCount",
        header: "保有人数",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.memberSkills.length}人</span>
        )
      },
      {
        accessorKey: "isActive",
        header: "状態",
        cell: ({ row }) => (
          <span
            className={
              row.original.isActive
                ? "font-medium text-emerald-700"
                : "text-[var(--muted-foreground)]"
            }
          >
            {row.original.isActive ? "有効" : "無効"}
          </span>
        )
      }
    ];

    if (canManage) {
      definitions.push({
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="small"
            className="min-h-11"
            onClick={() => setEditingSkillId(row.original.id)}
            aria-label={`${row.original.name}を編集`}
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </Button>
        )
      });
    }

    return definitions;
  }, [canManage]);

  // TanStack Table owns mutable internal state that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  // table のインスタンスはデータが変わっても同じなので、メモ化せず毎回まとめ直す
  const tableRows = table.getRowModel().rows;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const tableRowsById = new Map(tableRows.map((row) => [row.original.id, row]));
  const groupedRows = order
    .map((orderedCategory) => ({
      category: categoriesById.get(orderedCategory.id),
      rows: orderedCategory.skillIds.flatMap((id) => {
        const row = tableRowsById.get(id);
        return row ? [row] : [];
      })
    }))
    .filter(
      (group): group is { category: CategoryOption; rows: typeof tableRows } =>
        Boolean(group.category) &&
        (filters.q.trim() === "" && filters.categoryId === "" || group.rows.length > 0)
    );

  function updateOrder(next: SkillOrderCategory[]) {
    orderRef.current = next;
    setOrder(next);
  }

  function labelOf(id: UniqueIdentifier) {
    const key = String(id);
    if (key.startsWith("skill:")) {
      return initialSkills.find((skill) => skill.id === key.slice("skill:".length))?.name ?? "スキル";
    }
    return categoriesById.get(findCategoryId(orderRef.current, key) ?? "")?.name ?? "カテゴリ";
  }

  function positionOf(activeId: UniqueIdentifier, overId: UniqueIdentifier) {
    const active = String(activeId);
    const over = String(overId);
    if (active.startsWith("category:")) {
      const index = orderRef.current.findIndex((category) => categoryKey(category.id) === over);
      return index >= 0 ? `${index + 1}番目に移動しました` : "移動しました";
    }
    const categoryId = findCategoryId(orderRef.current, over);
    const category = orderRef.current.find((item) => item.id === categoryId);
    if (!category) return "移動しました";
    const index = over.startsWith("skill:")
      ? category.skillIds.indexOf(over.slice("skill:".length))
      : category.skillIds.length - 1;
    return `${categoriesById.get(category.id)?.name ?? "カテゴリ"}の${Math.max(index, 0) + 1}番目に移動しました`;
  }

  const collisionDetection: CollisionDetection = (args) => {
    // 別のカテゴリへ移した直後は、行の位置が測り直されるまで前の判定を使う（行が行き来して揺れるのを防ぐ）
    if (recentlyMovedToNewCategory.current && lastOverId.current) {
      return [{ id: lastOverId.current }];
    }
    const draggingCategory = String(args.active.id).startsWith("category:");
    const collisions = closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) =>
        draggingCategory
          ? String(container.id).startsWith("category:")
          : String(container.id).startsWith("skill:") || String(container.id).startsWith("container:")
      )
    });
    lastOverId.current = collisions[0]?.id ?? null;
    return collisions;
  };

  function handleDragStart(event: DragStartEvent) {
    dragStartOrder.current = orderRef.current;
    setActiveDragId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over) return;
    const active = String(event.active.id);
    const over = String(event.over.id);
    if (!active.startsWith("skill:")) return;
    const fromCategoryId = findCategoryId(orderRef.current, active);
    const toCategoryId = findCategoryId(orderRef.current, over);
    if (!fromCategoryId || !toCategoryId || fromCategoryId === toCategoryId) return;
    const insertAfter =
      over.startsWith("skill:") &&
      event.active.rect.current.translated !== null &&
      event.active.rect.current.translated.top +
        event.active.rect.current.translated.height / 2 >
        event.over.rect.top + event.over.rect.height / 2;
    recentlyMovedToNewCategory.current = true;
    updateOrder(moveSkillOrder(orderRef.current, active, over, insertAfter));
  }

  function handleDragEnd(event: DragEndEvent) {
    const before = dragStartOrder.current;
    dragStartOrder.current = null;
    setActiveDragId(null);
    if (!before) return;
    if (!event.over) {
      updateOrder(before);
      return;
    }
    const active = String(event.active.id);
    const over = String(event.over.id);
    const next = active.startsWith("category:")
      ? moveCategoryOrder(orderRef.current, active, over)
      : moveSkillOrder(orderRef.current, active, over);
    if (JSON.stringify(toSkillOrderPayload(before)) === JSON.stringify(toSkillOrderPayload(next))) return;
    updateOrder(next);
    saveOrder(next, before);
  }

  function saveOrder(next: SkillOrderCategory[], before: SkillOrderCategory[]) {
    startSavingOrder(async () => {
      const result = await reorderSkillsAction(toSkillOrderPayload(next));
      if (result.status === "error") {
        updateOrder(before);
        toast.error(result.message);
        return;
      }
      toast.success("並び順を保存しました", {
        action: {
          label: "元に戻す",
          onClick: () => {
            updateOrder(before);
            startSavingOrder(async () => {
              const undoResult = await reorderSkillsAction(toSkillOrderPayload(before));
              if (undoResult.status === "error") {
                updateOrder(next);
                toast.error(undoResult.message);
                return;
              }
              toast.success("元に戻しました");
              router.refresh();
            });
          }
        }
      });
      router.refresh();
    });
  }

  function handleEditSuccess() {
    setEditingSkillId(null);
    router.refresh();
    void query.refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-4">
        <div className="relative min-w-64 flex-1 md:max-w-sm">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Input
            id="skill-search-q"
            aria-label="スキル名"
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="スキル名を検索"
            className="rounded-full pl-9 pr-10"
          />
          {filters.q ? (
            <button
              type="button"
              aria-label="検索をクリア"
              className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              onClick={() => {
                setFilters((current) => ({ ...current, q: "" }));
                document.querySelector<HTMLInputElement>("#skill-search-q")?.focus();
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="flex max-w-full flex-wrap gap-1" aria-label="カテゴリ">
          {[{ id: "", name: "すべて" }, ...categories].map((category) => (
            <button
              key={category.id || "all"}
              type="button"
              aria-pressed={filters.categoryId === category.id}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-sm ${filters.categoryId === category.id ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}
              onClick={() => setFilters((current) => ({ ...current, categoryId: category.id }))}
            >
              {category.name}
            </button>
          ))}
        </div>
        <label className="ml-auto flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.isActive === ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                isActive: event.target.checked ? "" : "true"
              }))
            }
            className="h-4 w-4 accent-[var(--primary)]"
          />
          無効を含む
        </label>
      </div>

      <DndContext
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={() => {
          if (dragStartOrder.current) updateOrder(dragStartOrder.current);
          dragStartOrder.current = null;
          setActiveDragId(null);
        }}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "並び替える項目でスペースキーを押し、矢印キーで移動し、もう一度スペースキーで確定します。"
          },
          announcements: {
            onDragStart: ({ active }) => `${labelOf(active.id)}を持ち上げました`,
            onDragOver: ({ active, over }) =>
              over ? `${labelOf(active.id)}を${positionOf(active.id, over.id)}` : undefined,
            onDragEnd: ({ active }) => `${labelOf(active.id)}の移動を確定しました`,
            onDragCancel: () => "並び替えを取り消しました"
          }
        }}
      >
      {query.isError ? (
        <p
          role="alert"
          className="border-l-4 border-[var(--destructive)] bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          スキルの検索に失敗しました。時間を置いて再度お試しください。
        </p>
      ) : rows.length === 0 && !query.isFetching &&
        (!canManage || filters.q.trim() !== "" || filters.categoryId !== "" || categories.length === 0) ? (
        <EmptyState
          icon={SearchX}
          title="条件に一致するスキルがありません"
          description="キーワードやカテゴリ、状態を変更して再度検索してください。"
        >
          {hasNonInitialConditions ? (
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setFilters(emptySkillSearchFilters)}
            >
              条件をクリア
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <SortableContext
          items={order.map((category) => categoryKey(category.id))}
          strategy={verticalListSortingStrategy}
        >
        <div className="space-y-2">
          {groupedRows.map(({ category, rows: categoryRows }) => (
            <SortableCategorySection
              key={category.id}
              category={category}
              count={categoryRows.length}
              collapsed={collapsedCategories.has(category.id)}
              canManage={canManage}
              disabled={reorderDisabled}
              title={reorderTitle}
              reducedMotion={reducedMotion}
              onToggle={() =>
                setCollapsedCategories((current) => {
                  const next = new Set(current);
                  if (next.has(category.id)) next.delete(category.id);
                  else next.add(category.id);
                  return next;
                })
              }
            >
              {!collapsedCategories.has(category.id) ? (
                <table className="w-full min-w-[680px] table-fixed text-sm">
                  <colgroup>
                    {canManage ? <col className="w-14" /> : null}
                    <col className={canManage ? "w-[30%]" : "w-[34%]"} />
                    <col className={canManage ? "w-[26%]" : "w-[28%]"} />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    {canManage ? <col className="w-[12%]" /> : null}
                  </colgroup>
                  <thead className="bg-[var(--surface-subtle)] text-left text-[var(--muted-foreground)]">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {canManage ? <th scope="col" aria-label="並び替え" className="w-14" /> : null}
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            scope="col"
                            className="whitespace-nowrap px-3 py-3 font-medium"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <SortableContext
                    items={categoryRows.map((row) => skillKey(row.original.id))}
                    strategy={verticalListSortingStrategy}
                  >
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                    {categoryRows.map((row) => (
                      <SortableSkillRow
                        key={row.id}
                        row={row}
                        canManage={canManage}
                        disabled={reorderDisabled}
                        title={reorderTitle}
                        reducedMotion={reducedMotion}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 py-3 align-top text-[var(--foreground)]"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </SortableSkillRow>
                    ))}
                  </tbody>
                  </SortableContext>
                </table>
              ) : null}
            </SortableCategorySection>
          ))}
        </div>
        </SortableContext>
      )}
      <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
        {activeDragId ? (
          <div className="rounded-lg border border-[var(--primary)] bg-[var(--surface)] px-4 py-3 font-semibold shadow-lg">
            {labelOf(activeDragId)}
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      {canManage && editingSkill ? (
        <Dialog
          open
          onClose={() => setEditingSkillId(null)}
          title={`${editingSkill.name}を編集`}
          description="スキルの名称、カテゴリ、説明、状態を更新します。"
        >
          <div className="space-y-5">
            <ActionForm
              key={query.dataUpdatedAt}
              action={updateSkillAction}
              className="space-y-4"
              onSuccess={handleEditSuccess}
            >
              <input type="hidden" name="id" value={editingSkill.id} />
              <input type="hidden" name="code" value={editingSkill.code} />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  スキルコード
                </p>
                <p className="mt-1 text-sm text-[var(--foreground)]">
                  {editingSkill.code}
                </p>
              </div>
              <FormField
                id={`edit-skill-name-${editingSkill.id}`}
                label="スキル名"
                name="name"
                defaultValue={editingSkill.name}
                required
              />
              <SelectField
                id={`edit-skill-category-${editingSkill.id}`}
                label="カテゴリ"
                name="categoryId"
                defaultValue={editingSkill.categoryId}
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
              <TextareaField
                id={`edit-skill-description-${editingSkill.id}`}
                label="説明"
                name="description"
                defaultValue={editingSkill.description ?? ""}
              />
              <SkillLevelGuideFields
                idPrefix={`edit-skill-level-guide-${editingSkill.id}`}
                levels={levels}
                guides={editingSkill.levelGuides}
              />
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editingSkill.isActive}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                有効
              </label>
              <div className="flex justify-end">
                <SubmitButton pendingLabel="保存中…">保存</SubmitButton>
              </div>
            </ActionForm>

            <div className="border-t border-[var(--border)] pt-5">
              <div className="flex flex-wrap gap-3">
                <ActionForm action={deactivateSkillAction} onSuccess={handleEditSuccess}>
                  <input type="hidden" name="id" value={editingSkill.id} />
                  <ConfirmSubmitButton
                    pendingLabel="無効化中…"
                    variant="destructive"
                    disabled={!editingSkill.isActive}
                    confirm={{
                      title: "スキルを無効化しますか",
                      description: `「${editingSkill.name}」を無効化します。既存の設定内容は保持されます。`,
                      confirmLabel: "無効化する",
                      destructive: true
                    }}
                  >
                    スキルを無効化
                  </ConfirmSubmitButton>
                </ActionForm>
                {editingSkill.isDeletable ? (
                  <ActionForm action={deleteSkillAction} onSuccess={handleEditSuccess}>
                    <input type="hidden" name="id" value={editingSkill.id} />
                    <ConfirmSubmitButton
                      pendingLabel="削除中…"
                      variant="destructive"
                      confirm={{
                        title: "スキルを削除しますか",
                        description: `「${editingSkill.name}」を削除します。この操作は取り消せません。`,
                        confirmLabel: "削除する",
                        destructive: true
                      }}
                    >
                      スキルを削除
                    </ConfirmSubmitButton>
                  </ActionForm>
                ) : null}
              </div>
              {!editingSkill.isDeletable && editingSkill.reason ? (
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  {editingSkill.reason}
                </p>
              ) : null}
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function SortableCategorySection({
  category,
  count,
  collapsed,
  canManage,
  disabled,
  title,
  reducedMotion,
  onToggle,
  children
}: {
  category: CategoryOption;
  count: number;
  collapsed: boolean;
  canManage: boolean;
  disabled: boolean;
  title?: string;
  reducedMotion: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const {
    setNodeRef: setCategoryRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging
  } = useSortable({ id: categoryKey(category.id), disabled: !canManage || disabled });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: containerKey(category.id),
    disabled: !canManage || disabled
  });

  return (
    <section
      ref={(node) => {
        setCategoryRef(node);
        setDropRef(node);
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: reducedMotion ? undefined : transition
      }}
      className={`overflow-hidden rounded-xl border ${isDragging || isOver ? "border-[var(--primary)] shadow-md" : "border-[var(--border)]"}`}
    >
      <div className="flex min-h-11 items-center bg-[var(--surface-subtle)]">
        {canManage ? (
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${category.name}を並び替える`}
            disabled={disabled}
            title={title}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="flex min-h-11 flex-1 items-center gap-2 px-3 text-left font-semibold"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
          {category.name}
          <span className="text-sm font-normal text-[var(--muted-foreground)]">{count}件</span>
        </button>
      </div>
      {children}
    </section>
  );
}

function SortableSkillRow({
  row,
  canManage,
  disabled,
  title,
  reducedMotion,
  children
}: {
  row: Row<SkillRow>;
  canManage: boolean;
  disabled: boolean;
  title?: string;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: skillKey(row.original.id),
    disabled: !canManage || disabled
  });
  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: reducedMotion ? undefined : transition
      }}
      className={`${row.original.isActive ? "hover:bg-[var(--surface-subtle)]" : "bg-[var(--surface-subtle)] opacity-60"} ${isDragging ? "opacity-40" : ""}`}
    >
      {canManage ? (
        <td className="w-14 px-1 py-1 align-middle">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${row.original.name}を並び替える`}
            disabled={disabled}
            title={title}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" aria-hidden="true" />
          </button>
        </td>
      ) : null}
      {children}
    </tr>
  );
}

function AverageLevel({ value }: { value: number }) {
  if (value === 0)
    return (
      <span className="text-xs text-[var(--muted-foreground)]" aria-label="保有者なし">
        —
      </span>
    );
  return (
    <div className="flex items-center gap-2" aria-label={`保有者の平均 Lv${value.toFixed(1)}`}>
      <span className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className={`h-2 w-5 rounded-full ${level <= Math.round(value) ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
          />
        ))}
      </span>
      <span className="text-xs tabular-nums">Lv{value.toFixed(1)}</span>
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

async function fetchSkills(filters: SkillSearchFilters) {
  const searchParams = buildSkillSearchParams(filters);
  const queryString = searchParams.toString();
  const response = await fetch(`/api/skills${queryString ? `?${queryString}` : ""}`);

  if (!response.ok) {
    throw new Error("Failed to fetch skills.");
  }

  return (await response.json()) as SkillRow[];
}
