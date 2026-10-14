"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, MoreHorizontal, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  deactivateSkillAction,
  deleteSkillAction,
  updateSkillAction
} from "@/modules/skills/presentation/actions";
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
  isDeletable: boolean;
  reason: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

export function SkillSearchTable(props: {
  initialSkills: SkillRow[];
  categories: CategoryOption[];
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
  canManage
}: {
  initialSkills: SkillRow[];
  categories: CategoryOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<SkillSearchFilters>(emptySkillSearchFilters);
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
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

  // 追加・編集の後にサーバーの一覧が変わったら、表示中の検索結果も取り直す
  useEffect(() => {
    queryClient.setQueryData(
      ["skills", emptySkillSearchFilters],
      initialSkills.filter((skill) => skill.isActive)
    );
    void queryClient.invalidateQueries({ queryKey: ["skills"] });
  }, [initialSkills, queryClient]);

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
            onClick={() => setEditingSkill(row.original)}
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
  const groupedRows = categories
    .map((category) => ({
      category,
      rows: tableRows.filter((row) => row.original.categoryId === category.id)
    }))
    .filter((group) => group.rows.length > 0);

  function handleEditSuccess() {
    setEditingSkill(null);
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

      {query.isError ? (
        <p
          role="alert"
          className="border-l-4 border-[var(--destructive)] bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          スキルの検索に失敗しました。時間を置いて再度お試しください。
        </p>
      ) : rows.length === 0 && !query.isFetching ? (
        <EmptyState
          icon={SearchX}
          title="条件に一致するスキルがありません"
          description="キーワードやカテゴリ、状態を変更して再度検索してください。"
        />
      ) : (
        <div className="space-y-2">
          {groupedRows.map(({ category, rows: categoryRows }) => (
            <section
              key={category.id}
              className="overflow-hidden rounded-xl border border-[var(--border)]"
            >
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 bg-[var(--surface-subtle)] px-4 text-left font-semibold"
                aria-expanded={!collapsedCategories.has(category.id)}
                onClick={() =>
                  setCollapsedCategories((current) => {
                    const next = new Set(current);
                    if (next.has(category.id)) next.delete(category.id);
                    else next.add(category.id);
                    return next;
                  })
                }
              >
                {collapsedCategories.has(category.id) ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {category.name}
                <span className="text-sm font-normal text-[var(--muted-foreground)]">
                  {categoryRows.length}件
                </span>
              </button>
              {!collapsedCategories.has(category.id) ? (
                <table className="w-full min-w-[680px] table-fixed text-sm">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[28%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead className="bg-[var(--surface-subtle)] text-left text-[var(--muted-foreground)]">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
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
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                    {categoryRows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.original.isActive
                            ? "hover:bg-[var(--surface-subtle)]"
                            : "bg-[var(--surface-subtle)] opacity-60"
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 py-3 align-top text-[var(--foreground)]"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {canManage && editingSkill ? (
        <Dialog
          open
          onClose={() => setEditingSkill(null)}
          title={`${editingSkill.name}を編集`}
          description="スキルの名称、カテゴリ、説明、状態を更新します。"
        >
          <div className="space-y-5">
            <ActionForm
              action={updateSkillAction}
              className="space-y-4"
              onSuccess={handleEditSuccess}
            >
              <input type="hidden" name="id" value={editingSkill.id} />
              <FormField
                id={`edit-skill-code-${editingSkill.id}`}
                label="スキルコード"
                name="code"
                value={editingSkill.code}
                readOnly
                description="スキルコードは変更できません。"
              />
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

async function fetchSkills(filters: SkillSearchFilters) {
  const searchParams = buildSkillSearchParams(filters);
  const queryString = searchParams.toString();
  const response = await fetch(`/api/skills${queryString ? `?${queryString}` : ""}`);

  if (!response.ok) {
    throw new Error("Failed to fetch skills.");
  }

  return (await response.json()) as SkillRow[];
}
