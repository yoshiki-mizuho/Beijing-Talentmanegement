"use client";

import {
  type ColumnDef,
  type Header,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { getSkillLevelStyle } from "@/modules/skill-map/presentation/skill-level-style";

type SkillMapMatrix = {
  skills: {
    id: string;
    code: string;
    name: string;
    category: {
      name: string;
    };
  }[];
  rows: {
    memberId: string;
    employeeNo: string;
    memberName: string;
    departmentName: string;
    levels: {
      skillId: string;
      level: number | null;
    }[];
  }[];
  skillSummaries: {
    skillId: string;
    holderCount: number;
    averageLevel: number | null;
  }[];
};

type SkillMapRow = SkillMapMatrix["rows"][number];

export function SkillMapTable({ matrix }: { matrix: SkillMapMatrix }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<SkillMapRow>[]>(
    () => [
      {
        accessorKey: "employeeNo",
        header: "社員番号",
        meta: { sticky: true },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-[var(--muted-foreground)]">
            {row.original.employeeNo}
          </span>
        )
      },
      {
        accessorKey: "memberName",
        header: "氏名",
        meta: { sticky: true },
        cell: ({ row }) => (
          <span className="block max-w-44 break-words font-semibold text-[var(--foreground)]">
            {row.original.memberName}
          </span>
        )
      },
      {
        accessorKey: "departmentName",
        header: "部署",
        cell: ({ row }) => (
          <span className="block max-w-48 break-words text-[var(--muted-foreground)]">
            {row.original.departmentName}
          </span>
        )
      },
      ...matrix.skills.map<ColumnDef<SkillMapRow>>((skill) => ({
        id: skill.id,
        accessorFn: (row) =>
          row.levels.find((item) => item.skillId === skill.id)?.level ?? undefined,
        sortUndefined: "last",
        header: () => (
          <div className="w-32 whitespace-normal">
            <p className="break-words font-semibold text-[var(--foreground)]">
              {skill.name}
            </p>
            <p className="mt-0.5 break-words text-xs font-normal text-[var(--muted-foreground)]">
              {skill.category.name}
            </p>
          </div>
        ),
        cell: ({ row }) => {
          const level =
            row.original.levels.find((item) => item.skillId === skill.id)
              ?.level ?? null;

          return level === null ? (
            <span
              className="text-[var(--muted-foreground)]"
              aria-label={`${skill.name}は未設定`}
            >
              —
            </span>
          ) : (
            <Badge
              style={getSkillLevelStyle(level) ?? undefined}
              aria-label={`${skill.name}はレベル${level}`}
              className="min-w-12 justify-center tabular-nums"
            >
              Lv.{level}
            </Badge>
          );
        }
      }))
    ],
    [matrix.skills]
  );

  // TanStack Table owns mutable internal state that React Compiler cannot memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: matrix.rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" aria-label="スキルレベルの凡例">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">凡例</span>
        {[1, 2, 3, 4, 5].map((level) => (
          <Badge
            key={level}
            style={getSkillLevelStyle(level) ?? undefined}
            className="min-w-12 justify-center tabular-nums"
          >
            Lv.{level}
          </Badge>
        ))}
        <span className="text-xs text-[var(--muted-foreground)]">— 未設定</span>
      </div>
      <div
        className="overflow-x-auto border-t border-[var(--border)]"
        tabIndex={0}
        aria-label="メンバー別スキルマップ。横方向にスクロールできます"
      >
        <table className="min-w-max w-full text-sm">
          <thead className="bg-[var(--surface-subtle)] text-left">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={getAriaSort(header)}
                    className={cn(
                      "px-3 py-3 align-bottom font-medium text-[var(--muted-foreground)]",
                      index === 0 &&
                        "sticky left-0 z-20 w-28 min-w-28 max-w-28 bg-[var(--surface-subtle)]",
                      index === 1 &&
                        "sticky left-28 z-20 w-44 min-w-44 max-w-44 border-r border-[var(--border)] bg-[var(--surface-subtle)]"
                    )}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex min-h-11 w-full items-center gap-1 text-left font-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon direction={header.column.getIsSorted()} />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="group hover:bg-[var(--surface-subtle)]">
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-3 py-3 align-middle",
                      index === 0 &&
                        "sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--surface-subtle)]",
                      index === 1 &&
                        "sticky left-28 z-10 border-r border-[var(--border)] bg-[var(--surface)] group-hover:bg-[var(--surface-subtle)]"
                    )}
                  >
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

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;

  return <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

function getAriaSort(header: Header<SkillMapRow, unknown>) {
  const direction = header.column.getIsSorted();

  return direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined;
}
