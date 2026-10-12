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

export function buildMemberAvatarUrl(memberId: string, avatarUpdatedAt: Date | string | null) {
  if (!avatarUpdatedAt) return null;
  const milliseconds = new Date(avatarUpdatedAt).getTime();
  if (!Number.isFinite(milliseconds)) return null;
  return `/api/members/${encodeURIComponent(memberId)}/avatar?v=${milliseconds}`;
}

export function MemberAvatar({
  memberId,
  name,
  avatarUpdatedAt,
  size = "md",
  className,
  href
}: {
  memberId: string;
  name: string;
  avatarUpdatedAt: Date | string | null;
  size?: MemberAvatarSize;
  className?: string;
  href?: string;
}) {
  const url = buildMemberAvatarUrl(memberId, avatarUpdatedAt);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = url && failedUrl !== url;

  const avatar = (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full font-bold",
        sizeClasses[size],
        getMemberAvatarTone(memberId),
        className
      )}
      aria-hidden="true"
    >
      {showImage ? (
        // The authenticated, immutable avatar endpoint is intentionally used directly.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(url)}
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
