"use client";

import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { CheerCelebration } from "@/modules/growth/application/growth-service";
import { confirmCheerNotificationAction } from "@/modules/notifications/presentation/actions";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { MemberAvatar } from "@/shared/ui/member-avatar";

export function CheerCelebrationDialog({ celebrations }: { celebrations: CheerCelebration[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(celebrations.length > 0);
  const [pending, startTransition] = useTransition();
  const iconRef = useRef<HTMLDivElement>(null);
  const current = celebrations[index];

  useEffect(() => {
    if (!open || !current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = iconRef.current?.animate(
      [
        { opacity: 0, transform: "scale(0.85)" },
        { opacity: 1, transform: "scale(1)" }
      ],
      { duration: 500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );
    return () => animation?.cancel();
  }, [current, open]);

  // 次へ：今の1件だけを既読にして次へ進む。閉じる・Esc：残りもまとめて既読にして閉じる
  const confirmAndThen = useCallback(
    (destination: "next" | "close") => {
      if (!current || pending) return;
      const targets = destination === "next" ? [current] : celebrations.slice(index);
      startTransition(async () => {
        const formData = new FormData();
        for (const item of targets) formData.append("id", item.notificationId);
        const result = await confirmCheerNotificationAction(formData);
        if (result.status === "error") {
          toast.error(result.message);
          return;
        }
        if (destination === "next" && index < celebrations.length - 1) {
          setIndex((value) => value + 1);
        } else {
          setOpen(false);
          router.refresh();
        }
      });
    },
    [celebrations, current, index, pending, router]
  );
  const handleClose = useCallback(() => confirmAndThen("close"), [confirmAndThen]);

  if (!current) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      eyebrow={
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 font-bold tracking-[0.2em] text-amber-800">
          CHEER
        </span>
      }
      title={`${current.sender.name}さんから応援が届きました`}
      description={celebrations.length > 1 ? `${index + 1}/${celebrations.length}` : undefined}
      closeOnBackdrop={false}
      className="max-w-xl"
      footer={
        <Button
          disabled={pending}
          onClick={() => confirmAndThen(index < celebrations.length - 1 ? "next" : "close")}
        >
          {pending ? "確認中…" : index < celebrations.length - 1 ? "次へ" : "閉じる"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div
          ref={iconRef}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-50 text-amber-700"
          aria-hidden="true"
        >
          <HeartHandshake className="h-10 w-10" />
        </div>

        <div className="flex items-start gap-3">
          <MemberAvatar
            memberId={current.sender.id}
            name={current.sender.name}
            avatarUpdatedAt={current.sender.avatarUpdatedAt}
            className="h-11 w-11"
          />
          <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-7">
            「{current.message}」
          </p>
        </div>

        {current.targetSkillName ? (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-[var(--primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
              {current.targetSkillName}
            </span>
          </div>
        ) : null}

        {current.mentorMember ? (
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
            <p className="text-xs font-semibold text-[var(--muted-foreground)]">
              教えてもらえそうな人
            </p>
            <Link
              href={`/people/${current.mentorMember.id}`}
              className="mt-1 inline-flex min-h-11 items-center font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:underline"
            >
              {current.mentorMember.name}
            </Link>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
