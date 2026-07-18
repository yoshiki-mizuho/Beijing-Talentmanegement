"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ListFilter, RotateCcw, SearchX } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
  buildSkillSearchParams,
  emptySkillSearchFilters,
  type SkillSearchFilters
} from "@/modules/skills/presentation/skill-search-params";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryProvider } from "@/shared/ui/query-provider";
import { Select } from "@/shared/ui/select";

type SkillRow = {
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
}) {
  return (
    <QueryProvider>
      <SkillSearchTableInner {...props} />
    </QueryProvider>
  );
}

function SkillSearchTableInner({
  initialSkills,
  categories
}: {
  initialSkills: SkillRow[];
  categories: CategoryOption[];
}) {
  const [filters, setFilters] = useState<SkillSearchFilters>(
    emptySkillSearchFilters
  );
  const hasFilters = Object.values(filters).some(Boolean);
  const query = useQuery({
    queryKey: ["skills", filters],
    queryFn: () => fetchSkills(filters),
    initialData: hasFilters ? undefined : initialSkills,
    placeholderData: keepPreviousData
  });
  const rows = query.data ?? [];
  const columns = useMemo<ColumnDef<SkillRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "コード",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            {row.original.code}
          </span>
        )
      },
      {
        accessorKey: "name",
        header: "スキル",
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
        accessorKey: "isActive",
        header: "状態",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "neutral"}>
            {row.original.isActive ? "有効" : "無効"}
          </Badge>
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
        id: "roleRequirementCount",
        header: "ロール要件",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original._count.roleRequirements}件
          </span>
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
      }
    ],
    []
  );

  // TanStack Table owns mutable internal state that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

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
            placeholder="コード、名称、説明"
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
          aria-label="スキル検索結果。横方向にスクロールできます"
        >
          <table className="min-w-[900px] w-full text-sm">
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
