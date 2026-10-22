"use client";

import { CheckCircle2, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { MemberDashboardViewModel } from "@/modules/dashboard/presentation/member-dashboard-view-model";
import { DashboardSectionHeading } from "@/modules/dashboard/presentation/dashboard-section-heading";
import { updateMemberTargetRoleAction } from "@/modules/members/presentation/actions";
import { ActionForm } from "@/shared/ui/action-form";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/select";
import { SubmitButton } from "@/shared/ui/submit-button";

export function TargetRoleCard({ viewModel }: { viewModel: MemberDashboardViewModel }) {
  const [editing, setEditing] = useState(false);
  const role = viewModel.targetRole;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - (role?.achievementRate ?? 0) / 100);

  return (
    <section id="target-role" className="h-full scroll-mt-20 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 xl:px-4">
        <DashboardSectionHeading
          id="target-role-heading"
          icon={Target}
          title="目標ロール"
          description="目指す姿までの現在地を確認できます。"
        />
        {role && !editing ? (
          <Button variant="ghost" size="small" onClick={() => setEditing(true)}>
            変更
          </Button>
        ) : null}
      </div>
      <div className="p-5">
        {!role && !editing ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              目標ロールを設定すると、必要なスキルとの差が分かります。
            </p>
            <Button onClick={() => setEditing(true)}>設定する</Button>
          </div>
        ) : null}
        {role && !editing ? (
          <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
            <div className="relative mx-auto h-28 w-28">
              <svg viewBox="0 0 100 100" role="img" aria-label={`${role.name}の必須要件を${role.requiredSkillCount}件中${role.satisfiedSkillCount}件達成`} className="-rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E3E8E6" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="#0F766E" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
              </svg>
              <span className="absolute inset-0 grid place-items-center text-lg font-bold">{role.satisfiedSkillCount}/{role.requiredSkillCount}</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{role.name}</h3>
              {role.achieved ? (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />必須要件をすべて達成しています。</p>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-[var(--primary)]">あと {role.gaps.length} スキルで達成</p>
                  {role.gaps[0] ? (
                    <div className="mt-3 rounded-lg bg-[var(--surface-subtle)] p-3">
                      <p className="text-sm font-medium">{role.gaps[0].skillName} {role.gaps[0].currentLevel === null ? "未保有" : `Lv${role.gaps[0].currentLevel}`} → 必要 Lv{role.gaps[0].requiredLevel}</p>
                      <Link href="/my/skills" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)] hover:underline">申請する</Link>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : null}
        {role && !editing ? (
          <details className="mt-4 border-t border-[var(--border)] pt-1">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
              必要なスキルをすべて見る
            </summary>
            <ul className="space-y-2 pb-1">
              {role.requirements.map((requirement) => (
                <li
                  key={requirement.skillId}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-lg px-3 py-2 text-sm ${requirement.achieved ? "bg-[var(--primary-subtle)] text-[var(--primary)]" : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)]"}`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${requirement.achieved ? "opacity-100" : "opacity-30"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate font-medium">
                    {requirement.skillName}
                  </span>
                  <span className="whitespace-nowrap">必要 Lv{requirement.requiredLevel}</span>
                  <span className="whitespace-nowrap">{requirement.currentLevel === null ? "未保有" : `今 Lv${requirement.currentLevel}`}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : editing ? (
          <TargetRoleForm
            viewModel={viewModel}
            onSaved={() => setEditing(false)}
            onCancel={role ? () => setEditing(false) : undefined}
          />
        ) : null}
      </div>
    </section>
  );
}

function TargetRoleForm({ viewModel, onSaved, onCancel }: { viewModel: MemberDashboardViewModel; onSaved: () => void; onCancel?: () => void }) {
  return (
    <div>
      <p className="text-sm text-[var(--muted-foreground)]">目標にしたいロールを選んでください。後からいつでも変更・解除できます。</p>
      <ActionForm action={updateMemberTargetRoleAction} onSuccess={onSaved} className="mt-4 space-y-3">
        <input type="hidden" name="memberId" value={viewModel.memberId} />
        <Select name="targetRoleId" defaultValue={viewModel.targetRole?.id ?? ""} aria-label="目標ロール">
          <option value="">目標ロールを設定しない</option>
          {viewModel.roleOptions.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </Select>
        <div className="flex flex-wrap gap-3">
          <SubmitButton pendingLabel="保存中…">保存</SubmitButton>
          {onCancel ? <Button variant="ghost" onClick={onCancel}>キャンセル</Button> : null}
        </div>
      </ActionForm>
    </div>
  );
}
