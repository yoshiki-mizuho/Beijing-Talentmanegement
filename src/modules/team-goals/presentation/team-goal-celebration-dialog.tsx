"use client";

import { useState } from "react";

import type { TeamGoalCelebrationData } from "@/modules/team-goals/application/team-goal-service";
import { acknowledgeTeamGoalCelebrationAction } from "@/modules/team-goals/presentation/actions";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";

export function TeamGoalCelebrationDialog({
  celebration
}: {
  celebration: TeamGoalCelebrationData | null;
}) {
  // 閉じた目標の ID を覚える。目標を決めた直後など、後から届いたお知らせも開けるようにする
  const [closedId, setClosedId] = useState<string | null>(null);

  if (!celebration || celebration.id === closedId) return null;

  const close = () => {
    setClosedId(celebration.id);
    // 記録に失敗しても知らせない。次にダッシュボードを開いたときにもう一度出る
    void acknowledgeTeamGoalCelebrationAction(celebration.id);
  };

  return (
    <Dialog
      open
      onClose={close}
      eyebrow={celebration.heading}
      title="チーム目標を達成しました"
      className="max-w-[480px]"
      footer={(
        <Button className="h-11 min-w-40" onClick={close}>
          閉じる
        </Button>
      )}
    >
      <div className="relative flex min-h-56 flex-col items-center justify-center gap-5 overflow-hidden text-center">
        <span
          className="absolute left-5 top-3 h-2.5 w-2.5 rounded-full bg-[var(--accent-amber)]"
          aria-hidden="true"
        />
        <span
          className="absolute left-16 top-24 h-2 w-2 rounded-sm bg-[var(--accent-blue)]"
          aria-hidden="true"
        />
        <span
          className="absolute right-8 top-5 h-2 w-2 rounded-sm bg-[var(--primary)]"
          aria-hidden="true"
        />
        <span
          className="absolute right-16 top-28 h-2.5 w-2.5 rounded-full bg-[var(--accent-coral)]"
          aria-hidden="true"
        />
        <svg
          role="img"
          aria-label={celebration.ariaLabel}
          width="144"
          height="144"
          viewBox="0 0 144 144"
        >
          <circle
            cx="72"
            cy="72"
            r="62"
            fill="none"
            stroke="var(--primary-subtle)"
            strokeWidth="12"
          />
          <circle
            cx="72"
            cy="72"
            r="62"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M50 74l15 15 30-32"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-base font-medium">
          {celebration.result}
        </p>
      </div>
    </Dialog>
  );
}
