"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ListFilter, Pencil, RotateCcw, SearchX } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  deactivateSkillAction,
  updateSkillAction
} from "@/modules/skills/presentation/actions";
import {
  buildSkillSearchParams,
  emptySkillSearchFilters,
  type SkillSearchFilters
} from "@/modules/skills/presentation/skill-search-params";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryProvider } from "@/shared/ui/query-provider";
import { Select } from "@/shared/ui/select";
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
    roleRequirements: number;
  };
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
  const [filters, setFilters] = useState<SkillSearchFilters>(
    emptySkillSearchFilters
  );
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null);
  const hasFilters = Object.values(filters).some(Boolean);
  const query = useQuery({
    queryKey: ["skills", filters],
    queryFn: () => fetchSkills(filters),
    initialData: hasFilters ? undefined : initialSkills,
    placeholderData: keepPreviousData
  });
  const rows = query.data ?? [];

  useEffect(() => {
    queryClient.setQueryData(["skills", emptySkillSearchFilters], initialSkills);
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
        accessorKey: "category.name",
        header: "カテゴリ",
        cell: ({ row }) => (
          <Badge variant="primary">{row.original.category.name}</Badge>
        )
      },
      {
        accessorKey: "description",
        header: "説明",
        cell: ({ row }) => (
          <span className="block min-w-48 max-w-96 break-words text-[var(--muted-foreground)]">
            {row.original.description || "説明なし"}
          </span>
        )
      },
      {
        id: "memberSkillCount",
        header: "保有人数",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original._count.memberSkills}人</span>
        )
      },
      {
        accessorKey: "isActive",
        header: "状態",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "neutral"}>
            {row.original.isActive ? "有効" : "無効"}
          </Badge>
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
            variant="secondary"
            size="small"
            className="min-h-11"
            onClick={() => setEditingSkill(row.original)}
            aria-label={`${row.original.name}を編集`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            編集
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

  function handleEditSuccess() {
    setEditingSkill(null);
    router.refresh();
    void query.refetch();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 border-y border-[var(--border)] bg-[var(--surface-subtle)] p-4 md:grid-cols-[minmax(14rem,1fr)_14rem_10rem_auto]">
        <div>
          <Label htmlFor="skill-search-q">キーワード</Label>
          <Input
            id="skill-search-q"
            value={filters.q}
            onChange={(event) =>
              setFilters((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="名称、説明"
            className="mt-1 bg-[var(--surface)]"
          />
        </div>
        <SelectFilter
          id="skill-search-category"
          label="カテゴリ"
          value={filters.categoryId}
          onChange={(categoryId) =>
            setFilters((current) => ({ ...current, categoryId }))
          }
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter
          id="skill-search-active"
          label="状態"
          value={filters.isActive}
          onChange={(isActive) =>
            setFilters((current) => ({ ...current, isActive }))
          }
        >
          <option value="true">有効</option>
          <option value="false">無効</option>
        </SelectFilter>
        <div className="self-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => setFilters(emptySkillSearchFilters)}
            disabled={!hasFilters}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            条件をクリア
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]" aria-live="polite">
          <ListFilter className="h-4 w-4" aria-hidden="true" />
          {query.isFetching ? "検索結果を更新中..." : `${rows.length}件を表示`}
        </p>
        {hasFilters ? <Badge variant="primary">条件適用中</Badge> : null}
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
        <div
          className="overflow-x-auto border-t border-[var(--border)]"
          tabIndex={0}
          aria-label="スキル一覧。横方向にスクロールできます"
        >
          <table className="w-full min-w-[780px] text-sm">
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
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-subtle)]">
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
              <ActionForm
                action={deactivateSkillAction}
                onSuccess={handleEditSuccess}
              >
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
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function SelectFilter({
  id,
  label,
  value,
  onChange,
  children
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 bg-[var(--surface)]"
      >
        <option value="">すべて</option>
        {children}
      </Select>
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
