"use client";

import confetti from "canvas-confetti";
import { Award, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { LevelUpCelebration } from "@/modules/growth/application/growth-service";
import { confirmLevelUpNotificationAction } from "@/modules/notifications/presentation/actions";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";

export function LevelUpCelebrationDialog({
  celebrations
}: {
  celebrations: LevelUpCelebration[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(celebrations.length > 0);
  const [pending, startTransition] = useTransition();
  const contentRef = useRef<HTMLDivElement>(null);
  const current = celebrations[index];

  useEffect(() => {
    if (!open || !current) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const popAnimation = contentRef.current?.animate(
      [
        { opacity: 0, transform: "scale(0.95)" },
        { opacity: 1, transform: "scale(1)" }
      ],
      { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
    const endAt = Date.now() + 2500;
    let confettiFrame = 0;
    const celebrate = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 65,
        origin: { x: 0, y: 0.65 },
        colors: ["#0F766E", "#5EEAD4", "#F59E0B", "#3B82F6"],
        disableForReducedMotion: true
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 65,
        origin: { x: 1, y: 0.65 },
        colors: ["#0F766E", "#5EEAD4", "#F59E0B", "#3B82F6"],
        disableForReducedMotion: true
      });
      if (Date.now() < endAt) confettiFrame = window.requestAnimationFrame(celebrate);
    };
    celebrate();
    return () => {
      popAnimation?.cancel();
      window.cancelAnimationFrame(confettiFrame);
    };
  }, [current, open]);

  const confirmAndThen = useCallback((destination: "next" | "close" | "timeline") => {
    if (!current) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", current.notificationId);
      const result = await confirmLevelUpNotificationAction(formData);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      if (destination === "next" && index < celebrations.length - 1) {
        setIndex((value) => value + 1);
      } else {
        setOpen(false);
        if (destination === "timeline") {
          router.push("/dashboard#growth-timeline");
        } else {
          router.refresh();
        }
      }
    });
  }, [celebrations.length, current, index, router]);
  const handleClose = useCallback(() => confirmAndThen("close"), [confirmAndThen]);

  if (!current) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      eyebrow={<span className="inline-flex rounded-full bg-amber-100 px-3 py-1 font-bold tracking-[0.2em] text-amber-800">LEVEL UP</span>}
      title={`${current.skillName} が Lv${current.toLevel} になりました`}
      description={celebrations.length > 1 ? `${index + 1}/${celebrations.length}` : undefined}
      closeOnBackdrop={false}
      className="max-w-xl"
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={() => confirmAndThen("timeline")}>成長の記録を見る</Button>
          <Button disabled={pending} onClick={() => confirmAndThen(index < celebrations.length - 1 ? "next" : "close")}>
            {pending ? "確認中…" : index < celebrations.length - 1 ? "次へ" : "閉じる"}
          </Button>
        </>
      }
    >
      <div ref={contentRef} className="space-y-5 text-center">
        <div className="relative mx-auto grid h-28 w-28 place-items-center">
          <span className="absolute inset-2 rounded-full border-2 border-[var(--primary)] animate-ping motion-reduce:hidden" style={{ animationDuration: "1.25s", animationIterationCount: 2 }} aria-hidden="true" />
          <span className="relative grid h-24 w-24 place-items-center rounded-full bg-[var(--primary)] text-white shadow-lg">
            <span className="text-xs font-semibold">NEW LEVEL</span>
            <strong className="text-4xl">{current.toLevel}</strong>
          </span>
        </div>

        <div>
          <p className="text-lg font-bold">{current.fromLevel === null ? `新規 → Lv${current.toLevel}` : `Lv${current.fromLevel} → Lv${current.toLevel}`}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">{current.levelDescription}</p>
        </div>

        {current.managerName ? (
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4 text-left">
            <p className="text-xs font-semibold text-[var(--muted-foreground)]">承認したマネージャー</p>
            <p className="mt-1 text-sm font-semibold">{current.managerName}</p>
            {current.managerComment ? <p className="mt-2 text-sm leading-6">「{current.managerComment}」</p> : null}
          </div>
        ) : null}

        {current.targetRoleProgress ? (
          <div className="rounded-xl border border-[var(--border)] p-4 text-left">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">{current.targetRoleProgress.name}</span>
              <span>{current.targetRoleProgress.satisfiedCount}/{current.targetRoleProgress.requiredCount}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="progressbar" aria-label={`${current.targetRoleProgress.name}の進捗`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={current.targetRoleProgress.percentage}>
              <span className="block h-full rounded-full bg-[var(--primary)]" style={{ width: `${current.targetRoleProgress.percentage}%` }} />
            </div>
          </div>
        ) : null}

        {current.newBadges.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-amber-900">
            <p className="flex items-center gap-2 text-sm font-semibold"><Award className="h-4 w-4" aria-hidden="true" />新しいバッジを獲得しました</p>
            <ul className="mt-2 space-y-1 text-sm">{current.newBadges.map((badge) => <li key={badge.id} className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{badge.name}</li>)}</ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
