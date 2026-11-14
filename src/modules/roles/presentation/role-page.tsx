"use client";

import { AlertTriangle, Check, GitFork, Plus, Target, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, type MouseEvent } from "react";

import { updateMemberTargetRoleAction } from "@/modules/members/presentation/actions";
import {
  createRoleAction,
  deactivateRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "@/modules/roles/presentation/actions";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField, TextareaField } from "@/shared/ui/form-field";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";
import { Tooltip } from "@/shared/ui/tooltip";

type RoleItem = ReturnType<
  typeof import("./role-page-view-model").buildRolePageViewModel
>[number];
type SkillOption = { id: string; name: string; categoryName: string };
type DraftRequirement = { key: number; skillId: string; requiredLevel: number; anyOfGroup: number | null };
type DraftRequirementUnit =
  | { kind: "single"; requirement: DraftRequirement }
  | { kind: "group"; group: number; requirements: DraftRequirement[] };

function requirementsForSubmission(requirements: DraftRequirement[]) {
  const groupNumbers = new Map<number, number>();
  return requirements.filter((item) => item.skillId).map((item) => {
    if (item.anyOfGroup !== null && !groupNumbers.has(item.anyOfGroup)) {
      groupNumbers.set(item.anyOfGroup, groupNumbers.size + 1);
    }
    return {
      skillId: item.skillId,
      requiredLevel: item.requiredLevel,
      anyOfGroup: item.anyOfGroup === null ? null : groupNumbers.get(item.anyOfGroup)
    };
  });
}

export function RolePage({
  roles,
  selectedRoleId,
  viewerMemberId,
  scopeLabel,
  skills,
  canManage,
  showMemberStatus,
}: {
  roles: RoleItem[];
  selectedRoleId?: string;
  viewerMemberId: string;
  scopeLabel: string;
  skills: SkillOption[];
  canManage: boolean;
  showMemberStatus: boolean;
}) {
  const router = useRouter();
  const selectedRole =
    roles.find((role) => role.id === selectedRoleId) ??
    // 指定がなければ、自分の目標ロールを最初に開く
    roles.find((role) => role.isTarget) ??
    roles[0] ??
    null;
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ロール"
        description="社内のロールと、なるために必要なスキルです。"
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              ロールを追加
            </Button>
          ) : undefined
        }
      />

      {roles.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title="ロールがありません" />
        </Card>
      ) : (
        <div
          className={`grid gap-5 ${showMemberStatus ? "xl:grid-cols-[18rem_minmax(0,1fr)_20rem]" : "lg:grid-cols-[18rem_minmax(0,1fr)]"}`}
        >
          <RoleList roles={roles} selectedRoleId={selectedRole?.id} />
          {selectedRole ? (
            <RoleDetail
              role={selectedRole}
              viewerMemberId={viewerMemberId}
              canManage={canManage}
              onEdit={() => setEditOpen(true)}
              onRefresh={() => router.refresh()}
            />
          ) : null}
          {selectedRole && showMemberStatus ? (
            <MemberStatus role={selectedRole} title={scopeLabel} />
          ) : null}
        </div>
      )}

      {canManage ? (
        <RoleFormDialog
          key={`create-${createOpen}`}
          mode="create"
          open={createOpen}
          skills={skills}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            router.refresh();
          }}
        />
      ) : null}
      {canManage && selectedRole ? (
        <RoleFormDialog
          key={`edit-${selectedRole.id}-${editOpen}`}
          mode="edit"
          open={editOpen}
          role={selectedRole}
          skills={skills}
          onClose={() => setEditOpen(false)}
          onRefresh={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function RoleList({
  roles,
  selectedRoleId,
}: {
  roles: RoleItem[];
  selectedRoleId?: string;
}) {
  return (
    <div className="space-y-2">
      {roles.map((role) => {
        const percent = Math.round(role.ownAchievement.achievementRate * 100);
        return (
          <Link
            key={role.id}
            href={`/roles?role=${encodeURIComponent(role.id)}`}
            className={`block rounded-xl border p-4 ${role.id === selectedRoleId ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{role.name}</span>
              <span className="flex gap-1">
                {role.isTarget ? <Badge variant="warning">目標</Badge> : null}
                {role.ownAchievement.achieved ? (
                  <Badge variant="success">達成</Badge>
                ) : null}
                {role.ownAchievement.status === "requirements_updated" ? (
                  <Tooltip content="要件が更新されました">
                    <span tabIndex={0} aria-label="要件が更新されました">
                      <AlertTriangle className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                    </span>
                  </Tooltip>
                ) : null}
                {!role.isActive ? <Badge variant="neutral">無効</Badge> : null}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full bg-[var(--primary)]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              あなた：
              {role.ownAchievement.achieved
                ? "すべて達成"
                : `必須 ${role.ownAchievement.requiredCount}つのうち ${role.ownAchievement.satisfiedCount} 達成`}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

function RoleDetail({
  role,
  viewerMemberId,
  canManage,
  onEdit,
  onRefresh,
}: {
  role: RoleItem;
  viewerMemberId: string;
  canManage: boolean;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const missingCount =
    role.ownAchievement.requiredCount - role.ownAchievement.satisfiedCount;
  return (
    <Card>
      <CardContent className="space-y-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{role.name}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {role.description ?? "説明未設定"}
            </p>
          </div>
          {canManage ? (
            <Button variant="secondary" onClick={onEdit}>
              編集
            </Button>
          ) : null}
        </div>

        <div className="rounded-lg bg-[var(--primary-subtle)] p-4 text-sm">
          {role.ownAchievement.achieved ? (
            <p className="font-semibold">
              <Check className="mr-1 inline h-4 w-4" />
              達成しています
            </p>
          ) : role.isTarget ? (
            <p>
              <strong>あと {missingCount} スキルで達成</strong>　
              <Link className="underline" href="/my/skills">
                スキルシートで申請する
              </Link>
            </p>
          ) : (
            <ActionForm
              action={updateMemberTargetRoleAction}
              onSuccess={onRefresh}
            >
              <input type="hidden" name="memberId" value={viewerMemberId} />
              <input type="hidden" name="targetRoleId" value={role.id} />
              <SubmitButton pendingLabel="更新中…">目標にする</SubmitButton>
            </ActionForm>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">必要なスキル</th>
                <th>必要</th>
                <th>あなた</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {role.requirements.map((requirement) => {
                const firstInGroup = requirement.anyOfGroup !== null &&
                  role.requirements.find((item) => item.anyOfGroup === requirement.anyOfGroup)?.id === requirement.id;
                return (
                <Fragment key={requirement.id}>
                  {firstInGroup ? (
                    <tr className="bg-[var(--surface-subtle)]">
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-[var(--primary)]">
                        いずれか1つ
                      </td>
                    </tr>
                  ) : null}
                  <tr className={`border-b border-[var(--border)] ${requirement.anyOfGroup === null ? "" : "bg-[var(--surface-subtle)]"}`}>
                  <td className={`py-3 ${requirement.anyOfGroup === null ? "" : "border-l-2 border-[var(--primary)] pl-6"}`}>
                    {requirement.skill.name}
                    {requirement.isRequired ? null : (
                      <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                        （任意）
                      </span>
                    )}
                  </td>
                  <td>Lv{requirement.requiredLevel}</td>
                  <td>
                    {requirement.memberLevel === null
                      ? "未登録"
                      : `Lv${requirement.memberLevel}`}
                  </td>
                  <td>
                    {requirement.satisfied ? (
                      "達成"
                    ) : (
                      <Link
                        className="text-[var(--primary)] underline"
                        href={`/explore?skill=${encodeURIComponent(requirement.skillId)}`}
                      >
                        あと{" "}
                        {requirement.requiredLevel -
                          (requirement.memberLevel ?? 0)}
                        ・得意な人を探す
                      </Link>
                    )}
                  </td>
                </tr>
                </Fragment>
              );})}
            </tbody>
          </table>
        </div>
        <p className="text-sm font-medium">
          このロールを達成している人：{role.achievedMemberCount}名
        </p>
      </CardContent>
    </Card>
  );
}

function MemberStatus({ role, title }: { role: RoleItem; title: string }) {
  const [filter, setFilter] = useState<"target" | "achieved">("target");
  const [showAll, setShowAll] = useState(false);
  const members = role.visibleMemberStatuses.filter((member) =>
    filter === "target" ? member.isTarget : member.achieved,
  );
  const visible = showAll ? members : members.slice(0, 10);
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <h2 className="font-semibold">{title}</h2>
        <div className="flex gap-2">
          <Button
            size="small"
            variant={filter === "target" ? "primary" : "secondary"}
            onClick={() => setFilter("target")}
          >
            目標にしている{" "}
            {
              role.visibleMemberStatuses.filter((member) => member.isTarget)
                .length
            }
          </Button>
          <Button
            size="small"
            variant={filter === "achieved" ? "primary" : "secondary"}
            onClick={() => setFilter("achieved")}
          >
            達成{" "}
            {
              role.visibleMemberStatuses.filter((member) => member.achieved)
                .length
            }
          </Button>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {visible.map((member) => (
            <div key={member.id} className="flex gap-3 py-3">
              <MemberAvatar
                memberId={member.id}
                name={member.name}
                avatarUpdatedAt={member.avatarUpdatedAt}
                href={`/people/${member.id}`}
              />
              <div className="min-w-0">
                <p className="truncate font-medium">{member.name}</p>
                {member.requirementsUpdated ? (
                  <Tooltip content="要件が更新されました">
                    <span tabIndex={0} aria-label="要件が更新されました">
                      <AlertTriangle className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                    </span>
                  </Tooltip>
                ) : null}
                <p className="text-xs text-[var(--muted-foreground)]">
                  {member.achieved
                    ? "達成"
                    : `${Math.round(member.achievementRate * 100)}%・不足 ${member.missingRequirements.map((item) => item.skillName).join("、")}`}
                </p>
              </div>
            </div>
          ))}
          {members.length === 0 ? (
            <p className="py-4 text-sm text-[var(--muted-foreground)]">
              該当するメンバーはいません。
            </p>
          ) : null}
        </div>
        {!showAll && members.length > 10 ? (
          <Button variant="ghost" onClick={() => setShowAll(true)}>
            さらに表示
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RoleFormDialog({
  mode,
  open,
  role,
  skills,
  onClose,
  onSuccess,
  onRefresh,
}: {
  mode: "create" | "edit";
  open: boolean;
  role?: RoleItem;
  skills: SkillOption[];
  onClose: () => void;
  onSuccess?: () => void;
  onRefresh?: () => void;
}) {
  const initialRequirements =
    mode === "edit" && role
      ? role.requirements.map((requirement, index) => ({
          key: index + 1,
          skillId: requirement.skillId,
          requiredLevel: requirement.requiredLevel,
          anyOfGroup: requirement.anyOfGroup ?? null,
        }))
      : [];
  const [nextKey, setNextKey] = useState(initialRequirements.length + 1);
  const [requirements, setRequirements] =
    useState<DraftRequirement[]>(initialRequirements);
  const [formError, setFormError] = useState<string | null>(null);
  const selected = useMemo(
    () => new Set(requirements.map((item) => item.skillId).filter(Boolean)),
    [requirements],
  );
  const requirementUnits = useMemo(() => {
    const renderedGroups = new Set<number>();
    return requirements.flatMap<DraftRequirementUnit>((requirement) => {
      if (requirement.anyOfGroup === null) {
        return [{ kind: "single" as const, requirement }];
      }
      if (renderedGroups.has(requirement.anyOfGroup)) return [];
      renderedGroups.add(requirement.anyOfGroup);
      return [{
        kind: "group" as const,
        group: requirement.anyOfGroup,
        requirements: requirements.filter((item) => item.anyOfGroup === requirement.anyOfGroup),
      }];
    });
  }, [requirements]);

  function validateBeforeSubmit(event: MouseEvent<HTMLButtonElement>) {
    const invalidGroup = requirementUnits.some((unit) =>
      unit.kind === "group" && unit.requirements.filter((item) => item.skillId).length < 2
    );
    if (!invalidGroup) {
      setFormError(null);
      return;
    }
    event.preventDefault();
    setFormError("いずれかの組には、スキルを2つ以上入れてください。");
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        mode === "create" ? "新規ロール" : `${role?.name ?? "ロール"}を編集`
      }
    >
      <div className="space-y-6">
        <ActionForm
          action={mode === "create" ? createRoleAction : updateRoleAction}
          className="space-y-4"
          onSuccess={mode === "create" ? onSuccess : onRefresh}
        >
          {formError ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-[var(--danger)]">
              {formError}
            </p>
          ) : null}
          {mode === "edit" && role ? (
            <input type="hidden" name="id" value={role.id} />
          ) : null}
          {mode === "edit" && role ? (
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">
                ロールコード
              </p>
              <p className="mt-1 text-sm text-[var(--foreground)]">
                {role.code}
              </p>
            </div>
          ) : null}
          <FormField
            id={`${mode}-role-name`}
            label="ロール名"
            name="name"
            defaultValue={role?.name}
            required
          />
          <TextareaField
            id={`${mode}-role-description`}
            label="説明"
            name="description"
            defaultValue={role?.description ?? ""}
          />
          <input
            type="hidden"
            name="requirements"
            value={JSON.stringify(requirementsForSubmission(requirements))}
          />
          <section className="space-y-3">
            <h3 className="font-semibold">必要なスキル</h3>
            {requirementUnits.map((unit) => {
              const unitRequirements = unit.kind === "single" ? [unit.requirement] : unit.requirements;
              return (
              <div key={unit.kind === "single" ? unit.requirement.key : `group-${unit.group}`} className={unit.kind === "group" ? "space-y-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-3" : ""}>
                {unit.kind === "group" ? (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">次のうち いずれか1つ</p>
                    <Button type="button" variant="ghost" className="min-h-11 min-w-11 px-0" aria-label="この組を外す" onClick={() => setRequirements((items) => items.filter((item) => item.anyOfGroup !== unit.group))}>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
                {unitRequirements.map((requirement) => (
                <div key={requirement.key} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
                <select
                  className="min-h-11 rounded-md border bg-[var(--surface)] px-3"
                  aria-label="必要なスキル"
                  value={requirement.skillId}
                  onChange={(event) =>
                    setRequirements((items) =>
                      items.map((item) =>
                        item.key === requirement.key
                          ? { ...item, skillId: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">選んでください</option>
                  {skills
                    .filter(
                      (skill) =>
                        skill.id === requirement.skillId ||
                        !selected.has(skill.id),
                    )
                    .map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.categoryName} / {skill.name}
                      </option>
                    ))}
                </select>
                <select
                  className="min-h-11 rounded-md border bg-[var(--surface)] px-3"
                  aria-label="必要レベル"
                  value={requirement.requiredLevel}
                  onChange={(event) =>
                    setRequirements((items) =>
                      items.map((item) =>
                        item.key === requirement.key
                          ? {
                              ...item,
                              requiredLevel: Number(event.target.value),
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      Lv{level}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 min-w-11 px-0"
                  aria-label={`${skills.find((skill) => skill.id === requirement.skillId)?.name ?? "この行"}を外す`}
                  onClick={() =>
                    setRequirements((items) => items.filter((item) => item.key !== requirement.key))
                  }
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
                </div>
                ))}
                {unit.kind === "group" ? (
                  <Button type="button" variant="ghost" size="small" disabled={selected.size >= skills.length} onClick={() => {
                    setRequirements((items) => [...items, { key: nextKey, skillId: "", requiredLevel: 1, anyOfGroup: unit.group }]);
                    setNextKey((value) => value + 1);
                  }}>
                    ＋ 候補を追加
                  </Button>
                ) : null}
              </div>
            );})}
            <Button
              type="button"
              variant="secondary"
              disabled={selected.size >= skills.length}
              onClick={() => {
                setRequirements((items) => [
                  ...items,
                  { key: nextKey, skillId: "", requiredLevel: 1, anyOfGroup: null },
                ]);
                setNextKey((value) => value + 1);
              }}
            >
              ＋ スキルを追加
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={selected.size >= skills.length - 1}
              onClick={() => {
                const group = Math.max(0, ...requirements.map((item) => item.anyOfGroup ?? 0)) + 1;
                setRequirements((items) => [
                  ...items,
                  { key: nextKey, skillId: "", requiredLevel: 1, anyOfGroup: group },
                  { key: nextKey + 1, skillId: "", requiredLevel: 1, anyOfGroup: group },
                ]);
                setNextKey((value) => value + 2);
              }}
            >
              <GitFork className="mr-2 h-4 w-4" aria-hidden="true" />
              ＋ いずれかの組を追加
            </Button>
          </section>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={role?.isActive ?? true}
            />
            有効
          </label>
          <div className="flex justify-end">
            <SubmitButton pendingLabel="保存中…" onClick={validateBeforeSubmit}>保存</SubmitButton>
          </div>
        </ActionForm>
        {mode === "edit" && role ? (
          <div className="space-y-2 border-t pt-4">
            <div className="flex gap-2">
              <ActionForm action={deactivateRoleAction} onSuccess={onRefresh}>
                <input type="hidden" name="id" value={role.id} />
                <SubmitButton variant="secondary" pendingLabel="無効化中…">
                  無効化
                </SubmitButton>
              </ActionForm>
              <ActionForm action={deleteRoleAction} onSuccess={onRefresh}>
                <input type="hidden" name="id" value={role.id} />
                <ConfirmSubmitButton
                  variant="destructive"
                  pendingLabel="削除中…"
                  disabled={!role.canDelete}
                  title={
                    role.canDelete
                      ? "ロールを削除"
                      : "達成した人がいるロールは削除できません"
                  }
                  confirm={{
                    title: "ロールを削除しますか",
                    description: "この操作は取り消せません。",
                    confirmLabel: "削除する",
                    destructive: true,
                  }}
                >
                  削除
                </ConfirmSubmitButton>
              </ActionForm>
            </div>
            {role.canDelete ? null : (
              <p className="text-xs text-[var(--muted-foreground)]">
                達成した人がいるロールは削除できません。無効にしてください。
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
