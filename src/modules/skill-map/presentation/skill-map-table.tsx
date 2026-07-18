"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useMemo } from "react";

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
  const columns = useMemo<ColumnDef<SkillMapRow>[]>(
    () => [
      {
        accessorKey: "employeeNo",
        header: "社員番号"
      },
      {
        accessorKey: "memberName",
        header: "氏名"
      },
      {
        accessorKey: "departmentName",
        header: "部署"
      },
      ...matrix.skills.map<ColumnDef<SkillMapRow>>((skill) => ({
        id: skill.id,
        header: () => (
          <div className="min-w-28">
            <p className="font-medium text-slate-700">{skill.name}</p>
            <p className="text-xs font-normal text-slate-500">
              {skill.category.name}
            </p>
          </div>
        ),
        cell: ({ row }) => {
          const level =
            row.original.levels.find((item) => item.skillId === skill.id)
              ?.level ?? null;

          return (
            <span
              className={
                level === null
                  ? "inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-slate-100 px-2 text-xs text-slate-500"
                  : "inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-cyan-50 px-2 text-sm font-medium text-cyan-800"
              }
            >
              {level === null ? "-" : `Lv.${level}`}
            </span>
          );
        }
      }))
    ],
    [matrix.skills]
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: matrix.rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-3 py-3 align-bottom font-medium text-slate-600"
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
        <tbody className="divide-y divide-slate-100 bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-3 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
