"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryProvider } from "@/shared/ui/query-provider";

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

type Filters = {
  q: string;
  categoryId: string;
  isActive: string;
};

const emptyFilters: Filters = {
  q: "",
  categoryId: "",
  isActive: ""
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
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const query = useQuery({
    queryKey: ["skills", filters],
    queryFn: () => fetchSkills(filters),
    initialData: initialSkills
  });
  const columns = useMemo<ColumnDef<SkillRow>[]>(
    () => [
      {
        accessorKey: "code",
        header: "コード"
      },
      {
        accessorKey: "name",
        header: "スキル"
      },
      {
        accessorKey: "category.name",
        header: "カテゴリ",
        cell: ({ row }) => row.original.category.name
      },
      {
        accessorKey: "isActive",
        header: "状態",
        cell: ({ row }) => (row.original.isActive ? "有効" : "無効")
      },
      {
        id: "memberSkillCount",
        header: "保有人数",
        cell: ({ row }) => `${row.original._count.memberSkills}人`
      },
      {
        id: "roleRequirementCount",
        header: "ロール要件",
        cell: ({ row }) => `${row.original._count.roleRequirements}件`
      },
      {
        accessorKey: "description",
        header: "説明",
        cell: ({ row }) => row.original.description ?? ""
      }
    ],
    []
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: query.data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_160px_auto]">
        <div>
          <Label htmlFor="skill-search-q">キーワード</Label>
          <Input
            id="skill-search-q"
            value={filters.q}
            onChange={(event) =>
              setFilters((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="コード、名称、説明"
            className="mt-1"
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
            onClick={() => setFilters(emptyFilters)}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            クリア
          </Button>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        {query.isFetching ? "更新中..." : `${query.data.length}件を表示`}
      </p>
      {query.isError ? (
        <p role="alert" className="text-sm text-red-700">
          ????????????????????????????????????
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="whitespace-nowrap px-3 py-2 font-medium">
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
          <tbody className="divide-y divide-slate-100 bg-white">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="max-w-80 px-3 py-3 align-top text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
      >
        <option value="">すべて</option>
        {children}
      </select>
    </div>
  );
}

async function fetchSkills(filters: Filters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const response = await fetch(`/api/skills?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch skills.");
  }

  return (await response.json()) as SkillRow[];
}
