"use client";

import { useState } from "react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { badgePalette } from "@/modules/growth/domain/badge-art";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;
type Badge = Profile["badges"][number];

const groups = [
  { id: "growth", label: "成長" },
  { id: "social", label: "つながり" },
  { id: "secret", label: "シークレット" }
] as const;

export function ProfileBadges({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  const [selectedId, setSelectedId] = useState(profile.badges.find((badge) => badge.earnedAt)?.id ?? profile.badges[0]?.id);
  const selected = profile.badges.find((badge) => badge.id === selectedId);
  const earnedCount = profile.badges.filter((badge) => badge.earnedAt).length;

  return (
    <section id="badges" className="scroll-mt-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="profile-badges-heading">
      <h2 id="profile-badges-heading" className="text-[15px] font-bold">バッジ（{earnedCount} / {profile.badges.length}）</h2>
      {selected ? <BadgeDetail badge={selected} isOwner={isOwner} /> : null}
      {groups.map((group) => {
        const badges = profile.badges.filter((badge) => badge.group === group.id);
        return (
          <div key={group.id} className="mt-6">
            <h3 className="text-sm font-semibold">{group.label} <span className="font-normal text-[var(--muted-foreground)]">{badges.filter((badge) => badge.earnedAt).length} / {badges.length}</span></h3>
            <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
              {badges.map((badge) => <BadgeButton key={badge.id} badge={badge} selected={badge.id === selectedId} isOwner={isOwner} onSelect={() => setSelectedId(badge.id)} />)}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function BadgeDetail({ badge, isOwner }: { badge: Badge; isOwner: boolean }) {
  const secret = badge.group === "secret" && !badge.earnedAt;
  const progress = isOwner && !badge.earnedAt && !secret ? badge.progress : null;
  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl bg-[var(--surface-subtle)] p-4 sm:flex-row sm:items-center">
      <BadgeArt badge={badge} size="large" hidden={secret} />
      <div className="min-w-0">
        <p className="font-bold">{secret ? "？？？" : badge.name}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{secret ? "シークレット" : badge.rarityLabel}</p>
        <p className="mt-2 text-sm">{secret ? "条件はひみつです。取れたときに分かります。" : badge.condition}</p>
        {badge.earnedAt ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatDate(badge.earnedAt)}に獲得</p> : null}
        {progress ? <p className="mt-2 text-sm font-semibold text-[var(--primary)]">{progress.text}</p> : null}
      </div>
    </div>
  );
}

function BadgeButton({ badge, selected, isOwner, onSelect }: { badge: Badge; selected: boolean; isOwner: boolean; onSelect: () => void }) {
  const secret = badge.group === "secret" && !badge.earnedAt;
  const progress = isOwner && !badge.earnedAt && !secret ? badge.progress : null;
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className="flex min-h-24 items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-left aria-pressed:ring-2 aria-pressed:ring-[var(--primary)]">
      <BadgeArt badge={badge} hidden={secret} />
      <span className="min-w-0 flex-1 text-xs font-semibold">
        {secret ? "？？？" : badge.name}
        {progress?.current !== undefined && progress.target ? (
          <span className="mt-2 block">
            <span className="block h-1.5 overflow-hidden rounded-full bg-[var(--border)]" role="progressbar" aria-valuenow={progress.current} aria-valuemin={0} aria-valuemax={progress.target}>
              <span className="block h-full bg-[var(--primary)]" style={{ width: `${Math.round(progress.current / progress.target * 100)}%` }} />
            </span>
            <span className="mt-1 block font-normal text-[var(--muted-foreground)]">{progress.current} / {progress.target}</span>
          </span>
        ) : null}
      </span>
    </button>
  );
}

function BadgeArt({ badge, size = "small" }: { badge: Badge; hidden?: boolean; size?: "small" | "large" }) {
  const earned = Boolean(badge.earnedAt);
  const pixel = size === "large" ? "h-1 w-1" : "h-[3px] w-[3px]";
  // 未獲得のシークレットはサーバーで「？」の絵に差し替え済み
  return (
    <span
      className={`grid w-fit shrink-0 self-start grid-cols-12 grid-rows-12 rounded-xl border-2 p-2 sm:self-center ${earned ? "" : "border-dashed border-slate-400 bg-slate-100"}`}
      style={earned ? { borderColor: badge.frameColor, backgroundColor: badge.backgroundColor } : undefined}
      aria-hidden="true"
    >
      {badge.art.flatMap((row, rowIndex) =>
        Array.from(row).map((value, columnIndex) => (
          <span
            key={`${rowIndex}-${columnIndex}`}
            className={pixel}
            style={{
              backgroundColor:
                value === "." ? "transparent" : earned ? badgePalette[value] : "#94A3B8"
            }}
          />
        ))
      )}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" }).format(new Date(value));
}
