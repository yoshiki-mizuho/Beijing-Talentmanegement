import { AlertTriangle, ExternalLink } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { AvatarEditor } from "./avatar-editor";
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
    [`${profile.stats.daysSinceJoined}日`, "TalentHub を始めて"],
    [`${profile.stats.levelUpCount}回`, "これまでのレベルアップ"],
    [`${profile.achievedRoles.length}つ`, "達成したロール"],
    [String(profile.stats.encouragementCount), "受け取った応援・リアクション"],
    [`${profile.stats.mentoredCount}人`, "から「教えてもらえそうな人」に"],
    [`バッジ ${profile.badges.filter((badge) => badge.earnedAt).length}`, "獲得したバッジ"],
  ];

  return (
    <>
      <div className="h-24 bg-gradient-to-r from-[#0F766E] via-[#14B8A6] to-[#5EEAD4] sm:h-[120px]" />
      <div className="relative mx-auto -mt-12 max-w-6xl px-4 sm:px-6">
        <header className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end md:pt-0">
          <div className="relative w-fit md:-mt-8">
            <MemberAvatar
              memberId={profile.id}
              name={profile.name}
              avatarUpdatedAt={profile.avatarUpdatedAt}
              size="lg"
              className="h-28 w-28 border-4 border-white text-4xl shadow-lg"
              href={`/people/${profile.id}`}
            />
            {isOwner ? (
              <AvatarEditor hasAvatar={Boolean(profile.avatarUpdatedAt)} />
            ) : null}
          </div>
          <div className="min-w-0 md:pt-5">
            <h1 className="text-[26px] font-black">{profile.name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {profile.departmentName}
              {profile.jobTitle ? `・${profile.jobTitle}` : ""}
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
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-bold text-white"
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
          <div className="flex flex-wrap gap-x-7 gap-y-4 border-t border-[var(--border)] pt-4 md:col-span-3">
            {stats.map(([value, label]) => (
              <div key={label} className="min-w-24">
                <strong className="block text-[22px] font-black text-[var(--primary)]">
                  {value}
                </strong>
                <span className="text-xs text-[var(--muted-foreground)]">
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
