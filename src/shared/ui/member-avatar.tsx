"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/shared/lib/utils";

export type MemberAvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<MemberAvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl"
};

const avatarTones = {
  primary: "bg-[var(--hub-color-selected-bg)] text-[var(--hub-color-selected-text)]",
  info: "bg-[var(--hub-color-info-bg)] text-[var(--hub-color-info-text)]",
  warning: "bg-[var(--hub-color-warning-bg)] text-[var(--hub-color-warning-text)]",
  success: "bg-[var(--hub-color-success-bg)] text-[var(--hub-color-success-text)]",
  danger: "bg-[var(--hub-color-danger-bg)] text-[var(--hub-color-danger-text)]",
  neutral: "bg-[var(--hub-color-neutral-bg)] text-[var(--hub-color-neutral-text)]"
} as const;

export function getMemberInitial(name: string) {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("ja") ?? "?";
}

export function getMemberAvatarTone(memberId: string) {
  const tones = [
    avatarTones.primary,
    avatarTones.info,
    avatarTones.neutral,
    avatarTones.warning,
    avatarTones.danger
  ] as const;
  const hash = Array.from(memberId).reduce(
    (total, character) => total + character.codePointAt(0)!,
    0
  );
  return tones[hash % tones.length];
}

// 基盤の avatarColor の暖色・寒色・中性色の意味を、Hub の意味色へまとめる。
const avatarColorTones: Record<string, string> = {
  slate: avatarTones.neutral,
  gray: avatarTones.neutral,
  red: avatarTones.danger,
  orange: avatarTones.warning,
  amber: avatarTones.warning,
  yellow: avatarTones.warning,
  lime: avatarTones.success,
  green: avatarTones.success,
  emerald: avatarTones.success,
  teal: avatarTones.primary,
  cyan: avatarTones.info,
  sky: avatarTones.info,
  blue: avatarTones.info,
  indigo: avatarTones.info,
  violet: avatarTones.neutral,
  purple: avatarTones.neutral,
  fuchsia: avatarTones.danger,
  pink: avatarTones.danger,
  rose: avatarTones.danger
};

export function MemberAvatar({
  memberId,
  name,
  avatarUrl,
  avatarColor,
  size = "md",
  className,
  href
}: {
  memberId: string;
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  size?: MemberAvatarSize;
  className?: string;
  href?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = avatarUrl && failedUrl !== avatarUrl;
  const avatarTone =
    (avatarColor ? avatarColorTones[avatarColor] : undefined) ??
    getMemberAvatarTone(memberId);

  const avatar = (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full font-bold",
        sizeClasses[size],
        avatarTone,
        className
      )}
      aria-hidden="true"
    >
      {showImage ? (
        // The authenticated, immutable avatar endpoint is intentionally used directly.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        getMemberInitial(name)
      )}
    </span>
  );

  if (!href) return avatar;

  return (
    <Link
      href={href as Route}
      aria-label={`${name}さんのスキルを見る`}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
    >
      {avatar}
    </Link>
  );
}
