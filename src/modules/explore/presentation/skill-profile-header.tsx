import { AlertTriangle, ExternalLink } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { ProfileEditor } from "./profile-editor";
import { ProfileVisibility } from "./profile-visibility";
import { Badge } from "@/shared/ui/badge";
import { Tooltip } from "@/shared/ui/tooltip";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;

export function SkillProfileHeader({
  profile,
  isOwner,
}: {
  profile: Profile;
  isOwner: boolean;
}) {
  const stats = [
    [`${profile.stats.daysSinceJoined}日`, "TalentHubを始めて"],
    [`${profile.stats.levelUpCount}回`, "レベルアップ"],
    [`${profile.achievedRoles.length}個`, "保有ロール"],
    [String(profile.stats.encouragementCount), "応援・リアクション"],
    [`${profile.stats.mentoredCount}人`, "頼られた人数"],
    [String(profile.badges.filter((badge) => badge.earnedAt).length), "獲得バッジ"],
  ];

  return (
    <>
      <div className="h-24 bg-gradient-to-r from-[var(--hub-color-primary-800)] via-[var(--hub-color-primary-600)] to-[var(--hub-color-primary-300)] sm:h-[120px]" />
      <div className="relative mx-auto -mt-12 max-w-6xl px-4 sm:px-6">
        <header className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end md:pt-0">
          <div className="relative w-fit md:-mt-8">
            <MemberAvatar
              memberId={profile.id}
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              avatarColor={profile.avatarColor}
              size="lg"
              className="h-28 w-28 border-4 border-[var(--hub-color-surface)] text-4xl shadow-lg"
              href={`/talent/people/${profile.id}`}
            />
          </div>
          <div className="min-w-0 md:pt-5">
            <h1 className="text-[26px] font-black">{profile.name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {profile.nodeName}
            </p>
            {profile.profileMessage ? (
              <p className="mt-3 text-[15px] leading-7">
                「{profile.profileMessage}」
              </p>
            ) : isOwner ? (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                ひとことを書いてみましょう
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end md:pt-5">
            {!isOwner && profile.chatUrl ? (
              <a
                href={profile.chatUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-bold text-[var(--hub-color-text-on-primary)]"
              >
                相談する
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            {isOwner ? (
              <div className="flex flex-wrap items-center gap-2">
                <ProfileVisibility isPublic={profile.isProfilePublic} />
                <ProfileEditor profile={profile} />
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-3 md:col-span-3 lg:grid-cols-6">
            {stats.map(([value, label]) => (
              <div key={label} className="min-w-0">
                <strong className="block text-[length:var(--hub-text-xl)] font-black text-[var(--hub-color-primary)]">
                  {value}
                </strong>
                <span className="text-[length:var(--hub-text-xs)] text-[var(--hub-color-text-muted)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
          {profile.achievedRoles.length > 0 ? (
            <div className="flex flex-wrap gap-2 md:col-span-3">
              {profile.achievedRoles.map((role) => (
                <Badge key={`${role.name}-${role.achievedAt}`} variant="primary">
                  {role.name}
                  {role.requirementsUpdated ? (
                    <Tooltip content="要件が更新されました">
                      <span tabIndex={0} aria-label="要件が更新されました">
                        <AlertTriangle className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </Tooltip>
                  ) : null}
                </Badge>
              ))}
            </div>
          ) : null}
        </header>
      </div>
    </>
  );
}
