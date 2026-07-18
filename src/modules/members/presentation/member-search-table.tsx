"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryProvider } from "@/shared/ui/query-provider";

type MemberRow = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  status: string;
  jobTitle: string | null;
  departmentId: string;
  department: {
    id: string;
    name: string;
  };
  memberSkills: {
    id: string;
    skillId: string;
    level: number;
    skill: {
      id: string;
      name: string;
      category: {
        name: string;
      };
    };
  }[];
};

type DepartmentOption = {
  id: string;
  name: string;
};

type SkillOption = {
  id: string;
  name: string;
  category: {
    name: string;
  };
};

type RoleOption = {
  id: string;
  name: string;
  roleRequirements: {
    skillId: string;
    requiredLevel: number;
    isRequired: boolean;
    skill: {
      name: string;
    };
  }[];
};

type Filters = {
  q: string;
  departmentId: string;
  skillId: string;
  minLevel: string;
  roleId: string;
  status: string;
};

const emptyFilters: Filters = {
  q: "",
  departmentId: "",
  skillId: "",
  minLevel: "",
  roleId: "",
  status: ""
};

export function MemberSearchTable(props: {
  initialMembers: MemberRow[];
  departments: DepartmentOption[];
  skills: SkillOption[];
  roles: RoleOption[];
}) {
  return (
    <QueryProvider>
      <MemberSearchTableInner {...props} />
    </QueryProvider>
  );
}

function MemberSearchTableInner({
  initialMembers,
  departments,
  skills,
  roles
}: {
  initialMembers: MemberRow[];
  departments: DepartmentOption[];
  skills: SkillOption[];
  roles: RoleOption[];
}) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const query = useQuery({
    queryKey: ["members", filters],
    queryFn: () => fetchMembers(filters),
    initialData: initialMembers
  });

  const selectedRole = roles.find((role) => role.id === filters.roleId);
  const columns = useMemo<ColumnDef<MemberRow>[]>(
    () => [
      {
        accessorKey: "employeeNo",
        header: "社員番号"
      },
      {
        accessorKey: "name",
        header: "氏名"
      },
      {
        accessorKey: "department.name",
        header: "部署",
        cell: ({ row }) => row.original.department.name
      },
      {
        accessorKey: "jobTitle",
        header: "役職",
        cell: ({ row }) => row.original.jobTitle ?? "未設定"
      },
      {
        accessorKey: "memberSkills",
        header: "スキル",
        cell: ({ row }) =>
          row.original.memberSkills.length === 0
            ? "未設定"
            : row.original.memberSkills
                .slice(0, 3)
                .map((memberSkill) => `${memberSkill.skill.name} Lv.${memberSkill.level}`)
                .join(" / ")
      },
      {
        id: "roleStatus",
        header: "ロール保有",
        cell: ({ row }) => {
          if (selectedRole) {
            const result = evaluateRoleAchievement(
              selectedRole.roleRequirements.map((requirement) => ({
                skillId: requirement.skillId,
                requiredLevel: requirement.requiredLevel,
                isRequired: requirement.isRequired,
                skillName: requirement.skill.name
              })),
              row.original.memberSkills.map((memberSkill) => ({
                skillId: memberSkill.skillId,
                level: memberSkill.level,
                skillName: memberSkill.skill.name
              }))
            );

            return result.achieved
              ? "達成"
              : `未達 ${Math.round(result.achievementRate * 100)}%`;
          }

          const achievedCount = roles.filter((role) =>
            evaluateRoleAchievement(
              role.roleRequirements.map((requirement) => ({
                skillId: requirement.skillId,
                requiredLevel: requirement.requiredLevel,
                isRequired: requirement.isRequired
              })),
              row.original.memberSkills.map((memberSkill) => ({
                skillId: memberSkill.skillId,
                level: memberSkill.level
              }))
            ).achieved
          ).length;

          return `${achievedCount}/${roles.length}`;
        }
      }
    ],
    [roles, selectedRole]
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: query.data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="xl:col-span-2">
          <Label htmlFor="member-search-q">キーワード</Label>
          <Input
            id="member-search-q"
            value={filters.q}
            onChange={(event) =>
              setFilters((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="氏名、社員番号、メール"
            className="mt-1"
          />
        </div>
        <SelectFilter
          id="member-search-department"
          label="部署"
          value={filters.departmentId}
          onChange={(departmentId) =>
            setFilters((current) => ({ ...current, departmentId }))
          }
        >
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter
          id="member-search-skill"
          label="スキル"
          value={filters.skillId}
          onChange={(skillId) =>
            setFilters((current) => ({ ...current, skillId }))
          }
        >
          {skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.category.name} / {skill.name}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter
          id="member-search-level"
          label="最低レベル"
          value={filters.minLevel}
          onChange={(minLevel) =>
            setFilters((current) => ({ ...current, minLevel }))
          }
        >
          {[1, 2, 3, 4, 5].map((level) => (
            <option key={level} value={level}>
              Lv.{level}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter
          id="member-search-role"
          label="ロール"
          value={filters.roleId}
          onChange={(roleId) =>
            setFilters((current) => ({ ...current, roleId }))
          }
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </SelectFilter>
        <SelectFilter
          id="member-search-status"
          label="状態"
          value={filters.status}
          onChange={(status) =>
            setFilters((current) => ({ ...current, status }))
          }
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="LEAVE">LEAVE</option>
        </SelectFilter>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {query.isFetching ? "更新中..." : `${query.data.length}件を表示`}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setFilters(emptyFilters)}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          条件クリア
        </Button>
      </div>
      {query.isError ? (
        <p role="alert" className="text-sm text-red-700">
          ?????????????????????????????????????
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
                  <td key={cell.id} className="max-w-72 px-3 py-3 align-top text-slate-700">
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

async function fetchMembers(filters: Filters) {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const response = await fetch(`/api/members?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch members.");
  }

  return (await response.json()) as MemberRow[];
}
