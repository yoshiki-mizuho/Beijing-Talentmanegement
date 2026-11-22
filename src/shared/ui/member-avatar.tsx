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

export function getMemberInitial(name: string) {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("ja") ?? "?";
}

export function getMemberAvatarTone(memberId: string) {
  const tones = [
    "bg-teal-100 text-teal-800",
    "bg-sky-100 text-sky-800",
    "bg-violet-100 text-violet-800",
    "bg-amber-100 text-amber-800",
    "bg-rose-100 text-rose-800"
  ] as const;
  const hash = Array.from(memberId).reduce(
    (total, character) => total + character.codePointAt(0)!,
    0
  );
  return tones[hash % tones.length];
}

// 基盤の avatarColor（色の名前）ごとの色。Tailwind が拾えるように、クラス名をそのまま書く。
// tokens.css を読み込む H-6 で、基盤の色の決まりに合わせて見直す。
const avatarColorTones: Record<string, string> = {
  slate: "bg-slate-100 text-slate-800",
  gray: "bg-gray-100 text-gray-800",
  red: "bg-red-100 text-red-800",
  orange: "bg-orange-100 text-orange-800",
  amber: "bg-amber-100 text-amber-800",
  yellow: "bg-yellow-100 text-yellow-800",
  lime: "bg-lime-100 text-lime-800",
  green: "bg-green-100 text-green-800",
  emerald: "bg-emerald-100 text-emerald-800",
  teal: "bg-teal-100 text-teal-800",
  cyan: "bg-cyan-100 text-cyan-800",
  sky: "bg-sky-100 text-sky-800",
  blue: "bg-blue-100 text-blue-800",
  indigo: "bg-indigo-100 text-indigo-800",
  violet: "bg-violet-100 text-violet-800",
  purple: "bg-purple-100 text-purple-800",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800",
  pink: "bg-pink-100 text-pink-800",
  rose: "bg-rose-100 text-rose-800"
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
      aria-label={`${name}さんのプロフィールを見る`}
      className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
    >
      {avatar}
    </Link>
  );
}
