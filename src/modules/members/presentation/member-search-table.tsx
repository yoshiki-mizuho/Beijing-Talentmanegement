"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FilterX, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { buildMemberSearchParams, emptyMemberSearchFilters, hasMemberSearchFilters, type MemberSearchFilters } from "@/modules/members/presentation/member-search-filters";
import { MemberDetailModal } from "@/modules/members/presentation/member-detail-modal";
import type {
  DepartmentOption,
  ManagerOption,
  MemberRow,
  RoleOption,
  SkillOption,
  TargetRoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryProvider } from "@/shared/ui/query-provider";
import { Select } from "@/shared/ui/select";

export function MemberSearchTable(props: {
  initialMembers: MemberRow[];
  departments: DepartmentOption[];
  skills: SkillOption[];
  roles: RoleOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
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
  roles,
  managerCandidates,
  targetRoles,
  canDeactivateMembers,
  canEditGrowthSettings
}: {
  initialMembers: MemberRow[];
  departments: DepartmentOption[];
  skills: SkillOption[];
  roles: RoleOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
}) {
  const [filters, setFilters] = useState<MemberSearchFilters>(emptyMemberSearchFilters);
  const [debouncedKeyword, setDebouncedKeyword] = useState(filters.q);
  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const closeMemberDetail = useCallback(() => setSelectedMember(null), []);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(filters.q.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [filters.q]);

  const appliedFilters = useMemo(
    () => ({ ...filters, q: debouncedKeyword }),
    [debouncedKeyword, filters]
  );
  const searchParams = useMemo(
    () => buildMemberSearchParams(appliedFilters).toString(),
    [appliedFilters]
  );
  const hasActiveFilters = hasMemberSearchFilters(filters);
  const query = useQuery({
    queryKey: ["members", searchParams],
    queryFn: ({ signal }) => fetchMembers(searchParams, signal),
    initialData: searchParams ? undefined : initialMembers,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false
  });

  const members = query.data ?? [];
  const selectedRole = roles.find((role) => role.id === appliedFilters.roleId);
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
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="md:col-span-2 xl:col-span-2">
          <Label htmlFor="member-search-q">キーワード</Label>
          <Input
            id="member-search-q"
            value={filters.q}
            onChange={(event) =>
              setFilters((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="氏名、社員番号、メール、役職"
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
          label="在籍状態"
          value={filters.status}
          onChange={(status) =>
            setFilters((current) => ({ ...current, status }))
          }
        >
          <option value="ACTIVE">在籍中</option>
          <option value="INACTIVE">退職・無効</option>
          <option value="LEAVE">休職中</option>
        </SelectFilter>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {query.isPending ? "検索中..." : `${members.length}件`}
          </p>
          {hasActiveFilters ? <Badge variant="primary">条件適用中</Badge> : null}
          {query.isFetching && !query.isPending ? (
            <span className="text-xs text-[var(--muted-foreground)]">更新中...</span>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="small"
          disabled={!hasActiveFilters}
          onClick={() => setFilters(emptyMemberSearchFilters)}
        >
          <FilterX className="h-4 w-4" aria-hidden="true" />
          リセット
        </Button>
      </div>
      {query.isError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          メンバーの検索に失敗しました。時間をおいて再度お試しください。
        </p>
      ) : null}
      {!query.isPending && !query.isError && members.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="条件に一致するメンバーがいません"
          description="検索条件を変更するか、リセットして一覧を確認してください。"
        />
      ) : null}
      <div className={members.length === 0 ? "hidden" : "overflow-x-auto border border-[var(--border)]"} tabIndex={0} aria-label="メンバー検索結果">
        <table className="min-w-[920px] divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-subtle)] text-left text-[var(--muted-foreground)]">
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
          <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                role="button"
                aria-haspopup="dialog"
                aria-label={`${row.original.name}の詳細を開く`}
                className="cursor-pointer transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
                onClick={() => setSelectedMember(row.original)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedMember(row.original);
                  }
                }}
              >
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
      {selectedMember ? (
        <MemberDetailModal
          member={selectedMember}
          departments={departments}
          skills={skills}
          managerCandidates={managerCandidates}
          targetRoles={targetRoles}
          canDeactivateMembers={canDeactivateMembers}
          canEditGrowthSettings={canEditGrowthSettings}
          onClose={closeMemberDetail}
        />
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
        className="mt-1"
      >
        <option value="">すべて</option>
        {children}
      </Select>
    </div>
  );
}

async function fetchMembers(searchParams: string, signal: AbortSignal) {
  const response = await fetch(
    searchParams ? `/api/members?${searchParams}` : "/api/members",
    { signal }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch members.");
  }

  return (await response.json()) as MemberRow[];
}
