import { getSkillProfile } from "@/modules/explore/application/explore-service";
import { RecentLevelUps } from "@/modules/explore/presentation/recent-level-ups";
import { SkillHistory } from "@/modules/explore/presentation/skill-history";
import { SkillProfileHeader } from "@/modules/explore/presentation/skill-profile-header";
import { ProfileCards } from "@/modules/explore/presentation/profile-cards";
import { ProfileBadges } from "@/modules/explore/presentation/profile-badges";
import { requirePasswordReadyMember } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function SkillProfilePage({
  params
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await requirePasswordReadyMember();
  const { memberId } = await params;
  const profile = await getSkillProfile(
    { role: session.user.role, memberId: session.user.memberId },
    memberId
  );

  if (!profile) {
    return (
      <div className="grid min-h-[55vh] place-items-center">
        <h1 className="text-lg font-bold">このプロフィールは非公開です</h1>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-6 space-y-6 sm:-mx-6">
      <SkillProfileHeader profile={profile} isOwner={memberId === session.user.memberId} />
      <div className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6">
        <ProfileCards profile={profile} isOwner={memberId === session.user.memberId} />
        <ProfileBadges profile={profile} isOwner={memberId === session.user.memberId} />
        <RecentLevelUps items={profile.recent} />
        <SkillHistory name={profile.name} snapshots={profile.snapshots} />
      </div>
    </div>
  );
}
