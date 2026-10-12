"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FilterX, Search, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MemberDetailModal } from "@/modules/members/presentation/member-detail-modal";
import { MemberCreateDialog } from "@/modules/members/presentation/member-create-dialog";
import {
  getMemberStatusLabel,
  getTargetRoleProgressLabel,
  summarizeMemberSkills
} from "@/modules/members/presentation/member-display";
import {
  buildMemberSearchParams,
  emptyMemberSearchFilters,
  getMemberPageRange,
  MEMBER_PAGE_SIZE,
  type MemberSearchFilters
} from "@/modules/members/presentation/member-search-filters";
import type {
  DepartmentOption,
  ManagerOption,
  MemberRow,
  RoleOption,
  SkillOption,
  TargetRoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { evaluateRoleAchievement } from "@/modules/roles/domain/role-achievement";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { QueryProvider } from "@/shared/ui/query-provider";
import { Select } from "@/shared/ui/select";
import { Tooltip } from "@/shared/ui/tooltip";

type Props = {
  initialMembers: MemberRow[];
  departments: DepartmentOption[];
  skills: SkillOption[];
  roles: RoleOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
  viewerMemberId: string;
  scopeName: string;
};

export function MemberSearchTable(props: Props) {
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
  canEditGrowthSettings,
  viewerMemberId,
  scopeName
}: Props) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<MemberSearchFilters>(emptyMemberSearchFilters);
  const [debouncedKeyword, setDebouncedKeyword] = useState(filters.q);
  const [page, setPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const closeMemberDetail = useCallback(() => setSelectedMemberId(null), []);
  const activeInitialMembers = useMemo(
    () => initialMembers.filter((member) => member.status === "ACTIVE"),
    [initialMembers]
  );

  useEffect(() => {
    queryClient.setQueryData(["members", "status=ACTIVE"], activeInitialMembers);
  }, [activeInitialMembers, queryClient]);
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKeyword(filters.q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [filters.q]);
  const appliedFilters = useMemo(
    () => ({ ...filters, q: debouncedKeyword }),
    [debouncedKeyword, filters]
  );
  const searchParams = useMemo(
    () => buildMemberSearchParams(appliedFilters).toString(),
    [appliedFilters]
  );
  const query = useQuery({
    queryKey: ["members", searchParams],
    queryFn: ({ signal }) => fetchMembers(searchParams, signal),
    initialData: searchParams === "status=ACTIVE" ? activeInitialMembers : undefined,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false
  });
  const members = query.data ?? [];
  const range = getMemberPageRange(members.length, page);
  const pageMembers = members.slice(
    (range.currentPage - 1) * MEMBER_PAGE_SIZE,
    range.currentPage * MEMBER_PAGE_SIZE
  );
  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;
  const refreshMembers = useCallback(() => void query.refetch(), [query]);
  const updateFilters = (next: MemberSearchFilters) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">
          メンバー一覧{" "}
          <span className="text-base font-medium text-[var(--muted-foreground)]">
            {scopeName}・{members.length}名
          </span>
        </h1>
        <MemberCreateDialog
          departments={departments}
          managerCandidates={managerCandidates}
          targetRoles={targetRoles}
          canEditGrowthSettings={canEditGrowthSettings}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-4">
        <div className="relative min-w-56 flex-1 md:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Input
            aria-label="キーワード"
            value={filters.q}
            onChange={(event) => updateFilters({ ...filters, q: event.target.value })}
            placeholder="氏名・社員番号"
            className="rounded-full pl-9"
          />
        </div>
        <FilterChip
          label="スキル"
          value={
            filters.skillId ? skills.find((skill) => skill.id === filters.skillId)?.name : undefined
          }
        >
          <Select
            aria-label="スキル"
            value={filters.skillId}
            onChange={(event) => updateFilters({ ...filters, skillId: event.target.value })}
          >
            <option value="">すべて</option>
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.category.name} / {skill.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="最低レベル"
            value={filters.minLevel}
            onChange={(event) => updateFilters({ ...filters, minLevel: event.target.value })}
          >
            <option value="">最低レベルなし</option>
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                Lv.{level}以上
              </option>
            ))}
          </Select>
        </FilterChip>
        <FilterChip
          label="ロール"
          value={
            filters.roleId ? roles.find((role) => role.id === filters.roleId)?.name : undefined
          }
        >
          <Select
            aria-label="ロール"
            value={filters.roleId}
            onChange={(event) => updateFilters({ ...filters, roleId: event.target.value })}
          >
            <option value="">すべて</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </FilterChip>
        <FilterChip
          label="部署"
          value={
            filters.departmentId
              ? departments.find((department) => department.id === filters.departmentId)?.name
              : undefined
          }
        >
          <Select
            aria-label="部署"
            value={filters.departmentId}
            onChange={(event) => updateFilters({ ...filters, departmentId: event.target.value })}
          >
            <option value="">すべて</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </FilterChip>
        <div className="flex flex-wrap gap-1" aria-label="在籍状態">
          {[
            ["ACTIVE", "在籍中"],
            ["LEAVE", "休職中"],
            ["INACTIVE", "退職・無効"]
          ].map(([status, label]) => (
            <button
              key={status}
              type="button"
              aria-pressed={filters.status === status}
              className={chipClass(filters.status === status)}
              onClick={() =>
                updateFilters({ ...filters, status: filters.status === status ? "" : status })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="small"
          className="ml-auto"
          onClick={() => updateFilters(emptyMemberSearchFilters)}
        >
          <FilterX className="h-4 w-4" aria-hidden="true" />
          条件をクリア
        </Button>
      </div>
      <p className="text-sm font-semibold" aria-live="polite">
        {query.isFetching ? "検索中..." : `${members.length}名`}
      </p>
      {query.isError ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          メンバーの検索に失敗しました。
        </p>
      ) : null}
      {!query.isPending && !query.isError && members.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="条件に一致するメンバーがいません"
          description="検索条件を変更してください。"
        />
      ) : null}
      {members.length > 0 ? (
        <div
          className="overflow-x-auto rounded-xl border border-[var(--border)]"
          tabIndex={0}
          aria-label="メンバー検索結果"
        >
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-[var(--surface-subtle)] text-left text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3">メンバー</th>
                <th className="px-4 py-3">得意なスキル</th>
                <th className="px-4 py-3">目標ロール</th>
                <th className="px-4 py-3">状態</th>
                <th>
                  <span className="sr-only">詳細</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pageMembers.map((member) => (
                <tr
                  key={member.id}
                  className="cursor-pointer hover:bg-[var(--surface-subtle)]"
                  onClick={(event) => {
                    if ((event.target as Element).closest("a")) return;
                    setSelectedMemberId(member.id);
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        memberId={member.id}
                        name={member.name}
                        avatarUpdatedAt={member.avatarUpdatedAt}
                        href={`/people/${member.id}`}
                      />
                      <div>
                        <button
                          type="button"
                          className="font-semibold hover:underline"
                          aria-haspopup="dialog"
                          aria-label={`${member.name}の詳細を開く`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedMemberId(member.id);
                          }}
                        >
                          {member.name}
                        </button>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {member.jobTitle ?? "役職未設定"}・{member.employeeNo}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <MemberSkillsCell member={member} />
                  </td>
                  <td className="px-4 py-3">
                    <TargetRoleCell member={member} roles={roles} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className={cn("h-2 w-2 rounded-full", statusDot(member.status))} />
                      {getMemberStatusLabel(member.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xl text-[var(--muted-foreground)]">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {members.length > 0 ? (
        <Pagination total={members.length} range={range} onPage={setPage} />
      ) : null}
      {selectedMember ? (
        <MemberDetailModal
          member={selectedMember}
          departments={departments}
          skills={skills}
          managerCandidates={managerCandidates}
          targetRoles={targetRoles}
          canDeactivateMembers={canDeactivateMembers}
          canEditGrowthSettings={canEditGrowthSettings}
          viewerMemberId={viewerMemberId}
          onClose={closeMemberDetail}
          onMemberChanged={refreshMembers}
        />
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  value,
  children
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <details className="relative">
      <summary className={cn(chipClass(Boolean(value)), "list-none cursor-pointer")}>
        {value ? `${label}: ${value}` : label}
      </summary>
      <div className="absolute left-0 top-11 z-20 grid min-w-64 gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
        {children}
      </div>
    </details>
  );
}
function chipClass(active: boolean) {
  return cn(
    "min-h-9 rounded-full border px-3 text-sm font-medium",
    active
      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
  );
}
function statusDot(status: string) {
  return status === "ACTIVE"
    ? "bg-emerald-500"
    : status === "LEAVE"
      ? "bg-amber-500"
      : "bg-slate-400";
}

function MemberSkillsCell({ member }: { member: MemberRow }) {
  const { visibleSkills, hiddenSkills } = summarizeMemberSkills(member.memberSkills);
  if (!visibleSkills.length) return <span className="text-[var(--muted-foreground)]">未設定</span>;
  const summary = hiddenSkills.map((item) => `${item.skill.name} Lv.${item.level}`).join(" / ");
  return (
    <div className="flex flex-wrap gap-1">
      {visibleSkills.map((item) => (
        <Badge key={item.id} variant="primary">
          {item.skill.name} Lv.{item.level}
        </Badge>
      ))}
      {hiddenSkills.length ? (
        <Tooltip content={summary}>
          <Badge tabIndex={0} aria-label={`ほか${hiddenSkills.length}件: ${summary}`}>
            +{hiddenSkills.length}
          </Badge>
        </Tooltip>
      ) : null}
    </div>
  );
}
function TargetRoleCell({ member, roles }: { member: MemberRow; roles: RoleOption[] }) {
  const role = roles.find((item) => item.id === member.targetRoleId);
  if (!member.targetRole || !role)
    return <span className="text-[var(--muted-foreground)]">未設定</span>;
  const result = evaluateRoleAchievement(role.roleRequirements, member.memberSkills);
  const required = role.roleRequirements.filter((item) => item.isRequired).length;
  const satisfied = result.satisfiedRequirements.length;
  const rate = required === 0 ? 100 : Math.round((satisfied / required) * 100);
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold"
        style={{ background: `conic-gradient(var(--primary) ${rate}%, var(--border) 0)` }}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)]">
          {satisfied}/{required}
        </span>
      </span>
      <div>
        <p className="font-medium">{member.targetRole.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {getTargetRoleProgressLabel(satisfied, required)}
        </p>
      </div>
    </div>
  );
}
function Pagination({
  total,
  range,
  onPage
}: {
  total: number;
  range: ReturnType<typeof getMemberPageRange>;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted-foreground)]">
        {total}件中 {range.start}〜{range.end}件
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="small"
          aria-label="前のページ"
          disabled={range.currentPage === 1}
          onClick={() => onPage(range.currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: range.pageCount }, (_, index) => index + 1).map((item) => (
          <button
            key={item}
            type="button"
            aria-current={item === range.currentPage ? "page" : undefined}
            className={chipClass(item === range.currentPage)}
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="small"
          aria-label="次のページ"
          disabled={range.currentPage === range.pageCount}
          onClick={() => onPage(range.currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
async function fetchMembers(searchParams: string, signal: AbortSignal) {
  const response = await fetch(`/api/members?${searchParams}`, { signal });
  if (!response.ok) throw new Error("Failed to fetch members.");
  return (await response.json()) as MemberRow[];
}
