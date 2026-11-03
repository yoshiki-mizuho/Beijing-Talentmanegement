"use client";

import confetti from "canvas-confetti";
import { Check, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { toast } from "sonner";

import type { RoleAchievementCelebration } from "@/modules/growth/application/growth-service";
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
  const contentRef = useRef<HTMLDivElement>(null);
  const selected = celebration.candidates[selectedIndex];

  useEffect(() => {
    if (!open || step !== "achievement") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = contentRef.current?.animate(
      [{ opacity: 0, transform: "scale(0.94)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
    const requirementAnimations = Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>("[data-requirement]") ?? []
    ).map((element, index) => element.animate(
      [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 400, delay: 300 + index * 100, fill: "backwards", easing: "ease-out" }
    ));
    const endAt = Date.now() + 3500;
    let frame = 0;
    const celebrate = () => {
      confetti({
        particleCount: 8,
        spread: 75,
        startVelocity: 36,
        origin: { x: Math.random(), y: 0.55 },
        colors: ["#F59E0B", "#FBBF24", "#FDE68A", "#0F766E", "#5EEAD4"],
        disableForReducedMotion: true
      });
      if (Date.now() < endAt) frame = window.requestAnimationFrame(celebrate);
    };
    celebrate();
    return () => {
      animation?.cancel();
      requirementAnimations.forEach((requirementAnimation) => requirementAnimation.cancel());
      window.cancelAnimationFrame(frame);
    };
  }, [open, step]);

  const closeAndRefresh = (message?: string) => {
    onClose();
    router.refresh();
    if (message) toast.success(message);
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
        ? <span className="font-bold tracking-[0.2em] text-amber-700">ROLE COMPLETE</span>
        : <span className="inline-flex items-center gap-1.5 text-amber-700"><Trophy className="h-4 w-4" aria-hidden="true" />{celebration.roleName} 達成</span>}
      title={step === "achievement"
        ? `${celebration.roleName}になりました`
        : "次はどこを目指しますか"}
      footer={step === "achievement" ? <>
        <Button variant="secondary" onClick={() => closeAndRefresh()}>閉じる</Button>
        <Button onClick={() => setStep("next")}>次の目標ロールを決める →</Button>
      </> : hasCandidates ? <>
        <Button variant="secondary" disabled={pending} onClick={() => closeAndRefresh("ダッシュボードの目標ロールから、いつでも選べます")}>あとで決める</Button>
        <Button disabled={pending || !selected} onClick={chooseRole}>{pending ? "更新中…" : `${selected?.name ?? "ロール"}を目標にする`}</Button>
      </> : <Button onClick={() => closeAndRefresh()}>閉じる</Button>}
    >
      {step === "achievement" ? (
        <div ref={contentRef} className="space-y-6 text-center">
          <div className="relative mx-auto grid h-28 w-28 place-items-center">
            <span className="absolute inset-0 rounded-full bg-amber-300/30 blur-xl motion-reduce:hidden" aria-hidden="true" />
            <span className="absolute inset-2 animate-ping rounded-full border-2 border-amber-400 motion-reduce:hidden" style={{ animationDuration: "1.5s", animationIterationCount: 3 }} aria-hidden="true" />
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-amber-100 text-amber-700 shadow-lg"><Trophy className="h-10 w-10" aria-hidden="true" /></span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">必要なスキル {celebration.satisfiedRequirements.length}つ、すべて達成</p>
          <ul className="grid gap-3 text-left sm:grid-cols-2">
            {celebration.satisfiedRequirements.map((requirement) => (
              <li key={requirement.skillId} data-requirement className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <Check className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <span className="font-semibold text-amber-950">{requirement.skillName} Lv{requirement.requiredLevel}</span>
              </li>
            ))}
          </ul>
          {celebration.newBadges.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {celebration.newBadges.map((badge) => <span key={badge.id} className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">新しいバッジ「{badge.name}」</span>)}
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
                  className={cn("min-h-11 w-full cursor-pointer rounded-xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]", checked ? "border-[var(--primary)] bg-teal-50" : "border-[var(--border)]")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-semibold">{candidate.name}{index === 0 ? <span className="ml-2 inline-block whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">いちばん近い</span> : null}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">あと{candidate.missingCount}スキル：{candidate.missingSkills.join("・")}{candidate.hasMoreMissingSkills ? "・ほか" : ""}</p></div>
                    <strong>{candidate.percentage}%</strong>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${candidate.percentage}%` }} /></div>
                </button>;
              })}
            </div>
          ) : <p className="rounded-xl bg-[var(--surface-subtle)] p-5 text-center text-sm text-[var(--muted-foreground)]">ほかに目指せるロールはまだありません</p>}
          <Link href="/roles" onClick={onClose} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline">ほかのロールを見る</Link>
        </div>
      )}
    </Dialog>
  );
}
