"use client";

import { ChevronsUp, Sparkles } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import type { getMonthlyRecapCelebration } from "@/modules/growth/application/monthly-recap-service";
import { markMonthlyRecapSeenAction } from "@/modules/growth/presentation/monthly-recap-actions";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { FirstMoverBadge } from "@/modules/growth/presentation/first-mover-badge";

type Celebration = NonNullable<Awaited<ReturnType<typeof getMonthlyRecapCelebration>>>;

export function MonthlyRecapDialog({ celebration }: { celebration: Celebration | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(celebration));
  const [pending, startTransition] = useTransition();
  const close = useCallback((showAll: boolean) => {
    if (!celebration || pending) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("month", celebration.month);
      const result = await markMonthlyRecapSeenAction(formData);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setOpen(false);
      if (showAll) {
        router.push(`/my/recap?month=${celebration.month}` as Route);
      } else {
        router.refresh();
      }
    });
  }, [celebration, pending, router]);
  if (!celebration) return null;
  return (
    <Dialog
      open={open}
      onClose={() => close(false)}
      eyebrow={(
        <span className="inline-flex items-center gap-1 text-[var(--primary)]">
          <Sparkles className="h-4 w-4 motion-safe:animate-pulse" aria-hidden="true" />
          先月の振り返り
        </span>
      )}
      title={`${Number(celebration.month.slice(5))}月のあなた`}
      closeOnBackdrop={false}
      footer={(
        <>
          <Button variant="secondary" disabled={pending} onClick={() => close(false)}>
            閉じる
          </Button>
          <Button disabled={pending} onClick={() => close(true)}>
            振り返りを全部見る
          </Button>
        </>
      )}
    >
      <div className="space-y-5">
        <p className="rounded-xl bg-[#E6F4F1] p-4 font-semibold">{celebration.encouragement}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <DialogMetric label="レベルアップ" value={celebration.levelUpCount} />
          <DialogMetric label="新しいスキル" value={celebration.newSkillCount} />
          <DialogMetric label="届いた声" value={celebration.voiceCount} />
        </div>
        {celebration.levelUps.length ? (
          <div>
            <h3 className="text-sm font-semibold">レベルアップしたスキル</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {celebration.levelUps.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <ChevronsUp className="h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                  <span>
                    {item.skillName} {item.fromLevel === null ? "未登録" : `Lv${item.fromLevel}`} → Lv{item.toLevel}
                  </span>
                  {item.isFirstMover ? <FirstMoverBadge /> : null}
                </li>
              ))}
            </ul>
            {celebration.levelUps.length > 3 ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">ほか {celebration.levelUps.length - 3}件</p> : null}
          </div>
        ) : null}
        {celebration.badges.length ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">新しいバッジ：{celebration.badges.map((badge) => badge.name).join("、")}</p> : null}
        {celebration.roleProgress ? (
          <div>
            <p className="text-sm font-semibold">{celebration.roleProgress.roleName}</p>
            <p className="mt-1 text-sm">{celebration.roleProgress.startPercentage}% → {celebration.roleProgress.endPercentage}%（あと{celebration.roleProgress.missingCount}スキル）</p>
            <Progress startValue={celebration.roleProgress.startPercentage} endValue={celebration.roleProgress.endPercentage} />
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function DialogMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
      <strong className="block text-2xl text-[var(--primary)]">{value}</strong>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

function Progress({ startValue, endValue }: { startValue: number; endValue: number }) {
  const increase = Math.max(0, endValue - startValue);
  return (
    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="progressbar" aria-valuenow={endValue} aria-valuemin={0} aria-valuemax={100}>
      <span className="block h-full bg-[var(--primary)]" style={{ width: `${startValue}%` }} />
      <span className="block h-full bg-[#5EEAD4]" style={{ width: `${increase}%` }} />
    </div>
  );
}
