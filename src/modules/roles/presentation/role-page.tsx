"use client";

import { Check, Plus, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { updateMemberTargetRoleAction } from "@/modules/members/presentation/actions";
import {
  createRoleAction,
  deactivateRoleAction,
  deleteRoleAction,
  removeRoleRequirementAction,
  setRoleRequirementAction,
  updateRoleAction,
} from "@/modules/roles/presentation/actions";
import { ActionForm, ConfirmSubmitButton } from "@/shared/ui/action-form";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Dialog } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField, SelectField, TextareaField } from "@/shared/ui/form-field";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { PageHeader } from "@/shared/ui/page-header";
import { SubmitButton } from "@/shared/ui/submit-button";

type RoleItem = ReturnType<
  typeof import("./role-page-view-model").buildRolePageViewModel
>[number];
type SkillOption = { id: string; name: string; categoryName: string };
type DraftRequirement = { key: number; skillId: string; requiredLevel: number };

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
        <CreateRoleDialog
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
        <EditRoleDialog
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
              {role.requirements.map((requirement) => (
                <tr
                  key={requirement.id}
                  className="border-b border-[var(--border)]"
                >
                  <td className="py-3">
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
              ))}
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

function CreateRoleDialog({
  open,
  skills,
  onClose,
  onSuccess,
}: {
  open: boolean;
  skills: SkillOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nextKey, setNextKey] = useState(1);
  const [requirements, setRequirements] = useState<DraftRequirement[]>([]);
  const selected = useMemo(
    () => new Set(requirements.map((item) => item.skillId).filter(Boolean)),
    [requirements],
  );
  return (
    <Dialog open={open} onClose={onClose} title="新規ロール">
      <ActionForm
        action={createRoleAction}
        className="space-y-4"
        onSuccess={onSuccess}
      >
        <FormField
          id="create-role-name"
          label="ロール名"
          name="name"
          required
        />
        <TextareaField
          id="create-role-description"
          label="説明"
          name="description"
        />
        <input
          type="hidden"
          name="requirements"
          value={JSON.stringify(requirements.filter((item) => item.skillId))}
        />
        <section className="space-y-3">
          <h3 className="font-semibold">必要なスキル</h3>
          {requirements.map((requirement) => (
            <div
              key={requirement.key}
              className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]"
            >
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
                        ? { ...item, requiredLevel: Number(event.target.value) }
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
                onClick={() =>
                  setRequirements((items) =>
                    items.filter((item) => item.key !== requirement.key),
                  )
                }
              >
                外す
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            disabled={selected.size >= skills.length}
            onClick={() => {
              setRequirements((items) => [
                ...items,
                { key: nextKey, skillId: "", requiredLevel: 1 },
              ]);
              setNextKey((value) => value + 1);
            }}
          >
            ＋ スキルを追加
          </Button>
        </section>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked />
          有効
        </label>
        <div className="flex justify-end">
          <SubmitButton pendingLabel="登録中…">ロールを登録</SubmitButton>
        </div>
      </ActionForm>
    </Dialog>
  );
}

function EditRoleDialog({
  open,
  role,
  skills,
  onClose,
  onRefresh,
}: {
  open: boolean;
  role: RoleItem;
  skills: SkillOption[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const availableSkills = skills.filter(
    (skill) => !role.requirements.some((item) => item.skillId === skill.id),
  );
  return (
    <Dialog open={open} onClose={onClose} title={`${role.name}を編集`}>
      <div className="space-y-6">
        <ActionForm
          action={updateRoleAction}
          className="space-y-4"
          onSuccess={onRefresh}
        >
          <input type="hidden" name="id" value={role.id} />
          <FormField
            id={`role-name-${role.id}`}
            label="ロール名"
            name="name"
            defaultValue={role.name}
            required
          />
          <TextareaField
            id={`role-description-${role.id}`}
            label="説明"
            name="description"
            defaultValue={role.description ?? ""}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={role.isActive}
            />
            有効
          </label>
          <SubmitButton pendingLabel="更新中…">更新</SubmitButton>
        </ActionForm>
        <section className="space-y-3">
          <h3 className="font-semibold">必要なスキル</h3>
          {role.requirements.map((requirement) => (
            <div
              key={requirement.id}
              className="flex items-center justify-between gap-3 border-b py-2"
            >
              <span>
                {requirement.skill.name} Lv{requirement.requiredLevel}
              </span>
              <ActionForm
                action={removeRoleRequirementAction}
                onSuccess={onRefresh}
              >
                <input type="hidden" name="roleId" value={role.id} />
                <input
                  type="hidden"
                  name="skillId"
                  value={requirement.skillId}
                />
                <SubmitButton variant="destructive" pendingLabel="削除中…">
                  外す
                </SubmitButton>
              </ActionForm>
            </div>
          ))}
          {availableSkills.length ? (
            <ActionForm
              action={setRoleRequirementAction}
              className="grid gap-2 sm:grid-cols-[1fr_8rem_auto]"
              onSuccess={onRefresh}
            >
              <input type="hidden" name="roleId" value={role.id} />
              <input type="hidden" name="isRequired" value="true" />
              <SelectField
                id={`skill-${role.id}`}
                label="スキル"
                name="skillId"
                required
              >
                {availableSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id={`level-${role.id}`}
                label="必要レベル"
                name="requiredLevel"
                required
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </SelectField>
              <SubmitButton pendingLabel="追加中…">追加</SubmitButton>
            </ActionForm>
          ) : null}
        </section>
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
      </div>
    </Dialog>
  );
}
