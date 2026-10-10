import { ExternalLink } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import {
  getMemberAvatarTone,
  getMemberInitial
} from "@/modules/members/presentation/skill-approval";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { EarnedBadge } from "./earned-badge";
import { ProfileVisibility } from "./profile-visibility";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;

export function SkillProfileHeader({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex min-w-0 gap-4">
        <span
          className={cn(
            "grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-bold",
            getMemberAvatarTone(profile.id)
          )}
        >
          {getMemberInitial(profile.name)}
        </span>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold">{profile.name}</h1>
            {isOwner ? <ProfileVisibility isPublic={profile.isProfilePublic} /> : null}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {profile.departmentName}
            {profile.jobTitle ? `・${profile.jobTitle}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.achievedRoles.map((role) => (
              <Badge key={role} variant="primary">
                {role}
              </Badge>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.badges.map((badge) => (
              <EarnedBadge key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      </div>
      {!isOwner && profile.chatUrl ? (
        <a
          href={profile.chatUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
        >
          相談する
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : null}
    </header>
  );
}
