"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FilterX, Search, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buildMemberListSearchParams,
  parseMemberListSearchParams
} from "@/modules/members/domain/member-search";
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
import {
  evaluateMemberTargetRole,
  matchesTargetRoleFilter,
  type TargetRoleFilter
} from "@/modules/members/presentation/target-role-filter";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { QueryProvider } from "@/shared/ui/query-provider";
import { Select } from "@/shared/ui/select";
import { Tooltip } from "@/shared/ui/tooltip";
import { useDismissibleDetails } from "@/shared/ui/use-dismissible-details";

type Props = {
  initialMembers: MemberRow[];
  departments: DepartmentOption[];
  skills: SkillOption[];
  roles: RoleOption[];
  managerCandidates: ManagerOption[];
  targetRoles: TargetRoleOption[];
  canCreateMembers: boolean;
  canDeactivateMembers: boolean;
  canEditGrowthSettings: boolean;
  viewerMemberId: string;
  scopeName: string;
  initialFilters: MemberSearchFilters;
  initialPage: number;
  initialMemberId: string | null;
  initialTargetRoleFilter: TargetRoleFilter;
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
  canCreateMembers,
  canDeactivateMembers,
  canEditGrowthSettings,
  viewerMemberId,
  scopeName,
  initialFilters,
  initialPage,
  initialMemberId,
  initialTargetRoleFilter
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [filters, setFilters] = useState<MemberSearchFilters>(initialFilters);
  const [debouncedKeyword, setDebouncedKeyword] = useState(filters.q);
  const [page, setPage] = useState(initialPage);
  const [targetRoleFilter, setTargetRoleFilter] = useState(initialTargetRoleFilter);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialMemberId);
  const openedMemberFromList = useRef(false);
  const latestState = useRef({ filters, targetRoleFilter, page, selectedMemberId });
  // URL に反映済みのキーワード。変わったときだけページを1に戻す。
  const appliedKeyword = useRef(initialFilters.q.trim());
  const replaceUrl = useCallback((next: typeof latestState.current) => {
    const params = buildMemberListSearchParams({
      filters: next.filters,
      targetRole: next.targetRoleFilter,
      page: next.page,
      memberId: next.selectedMemberId
    });
    const queryString = params.toString();
    router.replace(queryString ? `/members?${queryString}` : "/members", { scroll: false });
  }, [router]);
  const closeMemberDetail = useCallback(() => {
    if (openedMemberFromList.current) {
      router.back();
      return;
    }
    setSelectedMemberId(null);
    replaceUrl({ ...latestState.current, selectedMemberId: null });
  }, [replaceUrl, router]);
  const activeInitialMembers = useMemo(
    () => initialMembers.filter((member) => member.status === "ACTIVE"),
    [initialMembers]
  );

  useEffect(() => {
    latestState.current = { filters, targetRoleFilter, page, selectedMemberId };
  }, [filters, page, selectedMemberId, targetRoleFilter]);
  useEffect(() => {
    queryClient.setQueryData(["members", "status=ACTIVE"], activeInitialMembers);
  }, [activeInitialMembers, queryClient]);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = latestState.current.filters.q.trim();
      if (q === appliedKeyword.current) return;
      appliedKeyword.current = q;
      setDebouncedKeyword(q);
      setPage(1);
      replaceUrl({
        ...latestState.current,
        filters: { ...latestState.current.filters, q },
        page: 1
      });
    }, 300);
    return () => window.clearTimeout(id);
  }, [filters.q, replaceUrl]);
  // ブラウザの「戻る・進む」のときだけ、URL から状態を読み戻す。
  // この画面が自分で書き換えた URL（router.replace / push）では popstate は起きない。
  useEffect(() => {
    const onPopState = () => {
      const next = parseMemberListSearchParams(new URLSearchParams(window.location.search));
      appliedKeyword.current = next.filters.q;
      setFilters(next.filters);
      setDebouncedKeyword(next.filters.q);
      setPage(next.page);
      setTargetRoleFilter(next.targetRole);
      setSelectedMemberId(next.memberId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
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
  const members = useMemo(
    () =>
      (query.data ?? []).filter((member) =>
        matchesTargetRoleFilter(member, roles, targetRoleFilter)
      ),
    [query.data, roles, targetRoleFilter]
  );
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
    if (next.q === filters.q) {
      replaceUrl({ ...latestState.current, filters: next, page: 1 });
    }
  };
  const clearFilters = () => {
    appliedKeyword.current = "";
    setFilters(emptyMemberSearchFilters);
    setDebouncedKeyword("");
    setTargetRoleFilter("");
    setPage(1);
    replaceUrl({
      filters: emptyMemberSearchFilters,
      targetRoleFilter: "",
      page: 1,
      selectedMemberId: null
    });
  };
  const hasNonInitialConditions =
    Object.entries(filters).some(
      ([key, value]) => value !== emptyMemberSearchFilters[key as keyof MemberSearchFilters]
    ) || targetRoleFilter !== "" || page !== 1;

  useEffect(() => {
    if (!selectedMemberId || query.isFetching || query.isPending) return;
    if (members.some((member) => member.id === selectedMemberId)) return;
    replaceUrl({ ...latestState.current, selectedMemberId: null });
  }, [members, query.isFetching, query.isPending, replaceUrl, selectedMemberId]);

  const openMemberDetail = (memberId: string) => {
    openedMemberFromList.current = true;
    setSelectedMemberId(memberId);
    const params = buildMemberListSearchParams({
      filters: latestState.current.filters,
      targetRole: latestState.current.targetRoleFilter,
      page: latestState.current.page,
      memberId
    });
    router.push(`/members?${params.toString()}`, { scroll: false });
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
        {canCreateMembers ? (
          <MemberCreateDialog
            departments={departments}
            managerCandidates={managerCandidates}
            targetRoles={targetRoles}
            canEditGrowthSettings={canEditGrowthSettings}
          />
        ) : null}
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
        <div className="flex flex-wrap gap-1" role="group" aria-label="目標ロール">
          {[
            ["", "すべて"],
            ["unset", "未設定"],
            ["achieved", "達成"],
            ["in_progress", "未達"]
          ].map(([value, label]) => (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={targetRoleFilter === value}
              className={chipClass(targetRoleFilter === value)}
              onClick={() => {
                const next = targetRoleFilter === value ? "" : (value as TargetRoleFilter);
                setTargetRoleFilter(next);
                setPage(1);
                replaceUrl({ ...latestState.current, targetRoleFilter: next, page: 1 });
              }}
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
          onClick={clearFilters}
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
        >
          {hasNonInitialConditions ? (
            <Button type="button" variant="secondary" size="small" onClick={clearFilters}>
              条件をクリア
            </Button>
          ) : null}
        </EmptyState>
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
                    openMemberDetail(member.id);
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
                            openMemberDetail(member.id);
                          }}
                        >
                          {member.name}
                        </button>
                        {member.growthHint ? (
                          <Tooltip
                            content={`育成のヒントあり（${formatHintDate(member.growthHint.generatedAt)}）`}
                          >
                            <span className="ml-2 inline-flex rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                              ✦ ヒント
                            </span>
                          </Tooltip>
                        ) : null}
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
        <Pagination
          total={members.length}
          range={range}
          onPage={(nextPage) => {
            setPage(nextPage);
            replaceUrl({ ...latestState.current, page: nextPage });
          }}
        />
      ) : null}
      {selectedMember ? (
        <MemberDetailModal
          member={selectedMember}
          departments={departments}
          skills={skills}
          managerCandidates={managerCandidates}
          targetRoles={targetRoles}
          roles={roles}
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

function formatHintDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
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
  const detailsRef = useDismissibleDetails();

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={cn(
          chipClass(Boolean(value)),
          "inline-flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden"
        )}
      >
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
  const result = evaluateMemberTargetRole(member, roles);
  if (!result) return <span className="text-[var(--muted-foreground)]">未設定</span>;
  const rate = result.requiredCount === 0 ? 100 : Math.round(result.achievementRate * 100);
  return (
    <div className="flex items-center gap-2">
      <span
        className="grid h-10 w-10 place-items-center rounded-full text-xs font-bold"
        style={{ background: `conic-gradient(var(--primary) ${rate}%, var(--border) 0)` }}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)]">
          {result.satisfiedCount}/{result.requiredCount}
        </span>
      </span>
      <div>
        <p className="font-medium">{member.targetRole.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {getTargetRoleProgressLabel(result.satisfiedCount, result.requiredCount)}
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
