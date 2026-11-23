"use client";

import { Check, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";

import type { RoleAchievementCelebration } from "@/modules/growth/application/growth-service";
import { acknowledgeRoleAchievementCelebrationAction } from "@/modules/growth/presentation/actions";
import { updateMemberTargetRoleAction } from "@/modules/members/presentation/actions";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";

export function RoleAchievedDialog({
  open,
  celebration,
  memberId,
  onClose
}: {
  open: boolean;
  celebration: RoleAchievementCelebration;
  memberId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"achievement" | "next">("achievement");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const selected = celebration.candidates[selectedIndex];

  const closeAndRefresh = (message?: string) => {
    startTransition(async () => {
      const result = await acknowledgeRoleAchievementCelebrationAction(
        celebration.achievementId
      );
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      onClose();
      router.refresh();
      if (message) toast.success(message);
    });
  };

  const chooseRole = () => {
    if (!selected) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("memberId", memberId);
      formData.set("targetRoleId", selected.id);
      const result = await updateMemberTargetRoleAction(formData);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      closeAndRefresh(`${selected.name}を目標にしました`);
    });
  };

  const handleRadioKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (selectedIndex + direction + celebration.candidates.length) % celebration.candidates.length;
    setSelectedIndex(nextIndex);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[nextIndex]?.focus();
  };

  const hasCandidates = celebration.candidates.length > 0;
  return (
    <Dialog
      open={open}
      onClose={() => closeAndRefresh()}
      closeOnBackdrop={false}
      className="max-w-2xl"
      eyebrow={step === "achievement"
        ? <span className="inline-flex rounded-[var(--hub-radius-sm)] bg-[var(--hub-color-success-bg)] px-[var(--hub-space-2)] py-[var(--hub-space-0-5)] text-[length:var(--hub-text-xs)] font-medium text-[var(--hub-color-success-text)]">ロールを達成しました</span>
        : <span className="inline-flex items-center gap-1.5 text-[var(--hub-color-success-text)]"><Trophy className="h-4 w-4" aria-hidden="true" />{celebration.roleName} 達成</span>}
      title={step === "achievement"
        ? `${celebration.roleName}になりました`
        : "次はどこを目指しますか"}
      footer={step === "achievement" ? <>
        <Button variant="secondary" onClick={() => closeAndRefresh()}>閉じる</Button>
        <Button onClick={() => setStep("next")}>次の目標ロールを決める</Button>
      </> : hasCandidates ? <>
        <Button variant="secondary" disabled={pending} onClick={() => closeAndRefresh("ダッシュボードの目標ロールから、いつでも選べます")}>あとで決める</Button>
        <Button disabled={pending || !selected} onClick={chooseRole}>{pending ? "更新中…" : `${selected?.name ?? "ロール"}を目標にする`}</Button>
      </> : <Button onClick={() => closeAndRefresh()}>閉じる</Button>}
    >
      {step === "achievement" ? (
        <div className="space-y-6 text-center">
          <div className="relative mx-auto grid h-28 w-28 place-items-center">
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-[var(--hub-color-success-bg)] text-[var(--hub-color-success-text)] shadow-[var(--hub-shadow-sm)]"><Trophy className="h-10 w-10" aria-hidden="true" /></span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">必要なスキル {celebration.satisfiedRequirements.length}つ、すべて達成</p>
          <ul className="grid gap-3 text-left sm:grid-cols-2">
            {celebration.satisfiedRequirements.map((requirement) => (
              <li key={requirement.skillId} className="flex items-center gap-3 rounded-[var(--hub-radius-md)] border border-[var(--hub-color-border)] bg-[var(--hub-color-surface)] p-3">
                <Check className="h-5 w-5 shrink-0 text-[var(--hub-color-success-text)]" aria-hidden="true" />
                <span className="font-semibold text-[var(--hub-color-text-heading)]">{requirement.skillName} Lv{requirement.requiredLevel}</span>
              </li>
            ))}
          </ul>
          {celebration.newBadges.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {celebration.newBadges.map((badge) => <span key={badge.id} className="rounded-[var(--hub-radius-sm)] bg-[var(--hub-color-info-bg)] px-[var(--hub-space-2)] py-[var(--hub-space-0-5)] text-[length:var(--hub-text-xs)] font-medium text-[var(--hub-color-info-text)]">新しいバッジ「{badge.name}」</span>)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          {hasCandidates ? (
            <div role="radiogroup" aria-label="次の目標ロール" className="space-y-3" onKeyDown={handleRadioKeyDown}>
              {celebration.candidates.map((candidate, index) => {
                const checked = index === selectedIndex;
                return <button
                  type="button"
                  key={candidate.id}
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  onClick={() => setSelectedIndex(index)}
                  className={cn("min-h-11 w-full cursor-pointer rounded-xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]", checked ? "border-[var(--hub-color-primary)] bg-[var(--hub-color-selected-bg)]" : "border-[var(--hub-color-border)]")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{candidate.name}{index === 0 ? <span className="ml-2 inline-block whitespace-nowrap rounded-[var(--hub-radius-sm)] bg-[var(--hub-color-neutral-bg)] px-[var(--hub-space-2)] py-[var(--hub-space-0-5)] text-[length:var(--hub-text-xs)] font-medium text-[var(--hub-color-neutral-text)]">いちばん近い</span> : null}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">あと{candidate.missingCount}スキル：{candidate.missingSkills.join("・")}{candidate.hasMoreMissingSkills ? "・ほか" : ""}</p></div>
                    <strong>{candidate.percentage}%</strong>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${candidate.percentage}%` }} /></div>
                </button>;
              })}
            </div>
          ) : <p className="rounded-xl bg-[var(--surface-subtle)] p-5 text-center text-sm text-[var(--muted-foreground)]">ほかに目指せるロールはまだありません</p>}
          <Link href="/talent/roles" onClick={onClose} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline">ほかのロールを見る</Link>
        </div>
      )}
    </Dialog>
  );
}
