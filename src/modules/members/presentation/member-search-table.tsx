"use client";

import { apiClient } from "@/shared/lib/api-client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FilterX, Search, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  buildMemberListSearchParams,
  parseMemberListSearchParams
} from "@/modules/members/domain/member-search";
import { MemberDetailModal } from "@/modules/members/presentation/member-detail-modal";
import {
  getMemberStatusLabel,
  getTargetRoleProgressLabel,
  summarizeMemberSkills
} from "@/modules/members/presentation/member-display";
import {
  buildMemberSearchParams,
  emptyMemberSearchFilters,
  type MemberSearchFilters
} from "@/modules/members/presentation/member-search-filters";
import type {
  OrganizationNodeOption,
  MemberListData,
  MemberListItem,
  MemberRow,
  RoleOption,
  SkillOption,
  TargetRoleOption
} from "@/modules/members/presentation/member-presentation-types";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import {
  evaluateMemberTargetRole,
  type TargetRoleFilter
} from "@/modules/members/presentation/target-role-filter";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { QueryProvider } from "@/shared/ui/query-provider";
import { Pagination } from "@/shared/ui/pagination";
import { Select } from "@/shared/ui/select";
import { Tooltip } from "@/shared/ui/tooltip";
import { useDismissibleDetails } from "@/shared/ui/use-dismissible-details";

type Props = {
  initialData: MemberListData;
  nodes: OrganizationNodeOption[];
  skills: SkillOption[];
  roles: RoleOption[];
  targetRoles: TargetRoleOption[];
  oneOnOneViewerMemberId: string | null;
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
  initialData,
  nodes,
  skills,
  roles,
  targetRoles,
  oneOnOneViewerMemberId,
  scopeName,
  initialFilters,
  initialPage,
  initialMemberId,
  initialTargetRoleFilter
}: Props) {
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
    router.replace(queryString ? `/talent/members?${queryString}` : "/talent/members", { scroll: false });
  }, [router]);
  const closeMemberDetail = useCallback(() => {
    if (openedMemberFromList.current) {
      router.back();
      return;
    }
    setSelectedMemberId(null);
    replaceUrl({ ...latestState.current, selectedMemberId: null });
  }, [replaceUrl, router]);
  useEffect(() => {
    latestState.current = { filters, targetRoleFilter, page, selectedMemberId };
  }, [filters, page, selectedMemberId, targetRoleFilter]);
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
    () => {
      const params = buildMemberSearchParams(appliedFilters);
      if (targetRoleFilter) params.set("targetRole", targetRoleFilter);
      params.set("page", String(page));
      return params.toString();
    },
    [appliedFilters, page, targetRoleFilter]
  );
  const initialSearchParams = useMemo(() => {
    const params = buildMemberSearchParams(initialFilters);
    if (initialTargetRoleFilter) params.set("targetRole", initialTargetRoleFilter);
    params.set("page", String(initialPage));
    return params.toString();
  }, [initialFilters, initialPage, initialTargetRoleFilter]);
  const query = useQuery({
    queryKey: ["members", searchParams],
    queryFn: ({ signal }) => fetchMembers(searchParams, signal),
    initialData: searchParams === initialSearchParams ? initialData : undefined,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false
  });
  const members = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? 0;
  const currentPage = query.data?.page ?? page;
  const clearSelectedMember = useCallback(() => {
    openedMemberFromList.current = false;
    setSelectedMemberId(null);
    replaceUrl({ ...latestState.current, selectedMemberId: null });
  }, [replaceUrl]);
  const detailQuery = useQuery({
    queryKey: ["member", selectedMemberId],
    queryFn: async ({ signal }) => {
      try {
        return await fetchMember(selectedMemberId as string, signal);
      } catch (error) {
        // 存在しない・範囲外のメンバーの ID は、エラーにせず URL から外す
        if (!signal.aborted) clearSelectedMember();
        throw error;
      }
    },
    enabled: Boolean(selectedMemberId),
    retry: false,
    refetchOnWindowFocus: false
  });
  const refreshMembers = useCallback(async () => {
    const memberId = latestState.current.selectedMemberId;
    const [list] = await Promise.all([query.refetch(), detailQuery.refetch()]);
    // 一覧から開いたメンバーが、更新（無効化など）で今の条件の一覧から外れたら、詳細を閉じる
    if (
      memberId &&
      openedMemberFromList.current &&
      !list.data?.items.some((member) => member.id === memberId)
    ) {
      clearSelectedMember();
    }
  }, [clearSelectedMember, detailQuery, query]);
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

  const openMemberDetail = (memberId: string) => {
    openedMemberFromList.current = true;
    setSelectedMemberId(memberId);
    const params = buildMemberListSearchParams({
      filters: latestState.current.filters,
      targetRole: latestState.current.targetRoleFilter,
      page: latestState.current.page,
      memberId
    });
    router.push(`/talent/members?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <h1 className="text-2xl font-semibold">
          メンバー一覧{" "}
          <span className="text-base font-medium text-[var(--muted-foreground)]">
            {scopeName}・{total}名
          </span>
        </h1>
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
            placeholder="氏名"
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
          label="組織"
          value={
            filters.nodeId
              ? nodes.find((node) => node.id === filters.nodeId)?.name
              : undefined
          }
        >
          <Select
            aria-label="組織"
            value={filters.nodeId}
            onChange={(event) => updateFilters({ ...filters, nodeId: event.target.value })}
          >
            <option value="">すべて</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </Select>
        </FilterChip>
        <div className="flex flex-wrap gap-1" aria-label="在籍状態">
          {[
            ["ACTIVE", "在籍中"],
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
        {query.isFetching ? "検索中..." : `${total}名`}
      </p>
      {query.isError ? (
        <p role="alert" className="rounded-md bg-[var(--hub-color-danger-bg)] p-3 text-sm text-[var(--hub-color-danger-text)]">
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
          className="relative overflow-x-auto rounded-[var(--hub-radius-xl)] border border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] shadow-[var(--hub-shadow-sm)]"
          tabIndex={0}
          aria-label="メンバー検索結果"
        >
          <table className="w-full min-w-[850px] text-[length:var(--hub-text-sm)]">
            <thead className="border-b border-[var(--hub-color-border)] bg-[var(--hub-color-surface-subtle)] text-left text-[length:var(--hub-text-xs)] font-medium tracking-[var(--hub-tracking-wide)] text-[var(--hub-color-text-muted)]">
              <tr>
                <th className="px-[var(--hub-space-4)] py-[var(--hub-space-2)] font-medium">メンバー</th>
                <th className="px-[var(--hub-space-4)] py-[var(--hub-space-2)] font-medium">得意なスキル</th>
                <th className="px-[var(--hub-space-4)] py-[var(--hub-space-2)] font-medium">目標ロール</th>
                <th className="px-[var(--hub-space-4)] py-[var(--hub-space-2)] font-medium">状態</th>
                <th className="px-[var(--hub-space-4)] py-[var(--hub-space-2)] text-right font-medium">
                  <span className="sr-only">詳細</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hub-color-border-subtle)] text-[var(--hub-color-text-sub)]">
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="cursor-pointer hover:bg-[var(--surface-subtle)]"
                  onClick={(event) => {
                    if ((event.target as Element).closest("a")) return;
                    openMemberDetail(member.id);
                  }}
                >
                  <td className="px-[var(--hub-space-4)] py-[var(--hub-space-3)]">
                    <div className="flex items-center gap-3">
                      <MemberAvatar
                        memberId={member.id}
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        avatarColor={member.avatarColor}
                        href={`/talent/people/${member.id}`}
                      />
                      <div>
                        <button
                          type="button"
                          className="font-medium text-[var(--hub-color-text-heading)] hover:underline"
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
                          {member.organizationNode?.name ?? "所属未設定"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-[var(--hub-space-4)] py-[var(--hub-space-3)]">
                    <MemberSkillsCell member={member} />
                  </td>
                  <td className="px-[var(--hub-space-4)] py-[var(--hub-space-3)]">
                    <TargetRoleCell member={member} roles={roles} />
                  </td>
                  <td className="px-[var(--hub-space-4)] py-[var(--hub-space-3)]">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className={cn("h-2 w-2 rounded-full", statusDot(member.status))} />
                      {getMemberStatusLabel(member.status)}
                    </span>
                  </td>
                  <td className="px-[var(--hub-space-4)] py-[var(--hub-space-3)] text-right text-xl text-[var(--hub-color-text-muted)]">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {members.length > 0 ? (
        <Pagination
          total={total}
          page={currentPage}
          pageSize={query.data?.pageSize ?? 20}
          onPage={(nextPage) => {
            setPage(nextPage);
            replaceUrl({ ...latestState.current, page: nextPage });
          }}
        />
      ) : null}
      {selectedMemberId && detailQuery.isPending ? (
        <p aria-live="polite">読み込み中...</p>
      ) : null}
      {detailQuery.data ? (
        <MemberDetailModal
          member={detailQuery.data}
          skills={skills}
          targetRoles={targetRoles}
          roles={roles}
          oneOnOneViewerMemberId={oneOnOneViewerMemberId}
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
      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--hub-color-text-on-primary)]"
      : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
  );
}
function statusDot(status: string) {
  return status === "ACTIVE"
    ? "bg-[var(--hub-color-success)]"
    : "bg-[var(--hub-color-neutral-text)]";
}

function MemberSkillsCell({ member }: { member: MemberListItem }) {
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
function TargetRoleCell({ member, roles }: { member: MemberListItem; roles: RoleOption[] }) {
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
async function fetchMembers(searchParams: string, signal: AbortSignal) {
  const response = await apiClient(`/api/talent/v1/members?${searchParams}`, { signal });
  if (!response.ok) throw new Error("Failed to fetch members.");
  return (await response.json()) as MemberListData;
}

async function fetchMember(memberId: string, signal: AbortSignal) {
  const response = await apiClient(`/api/talent/v1/members/${encodeURIComponent(memberId)}`, { signal });
  if (!response.ok) throw new Error("Failed to fetch member.");
  return (await response.json()) as MemberRow;
}
