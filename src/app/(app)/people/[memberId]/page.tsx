import { getSkillProfile } from "@/modules/explore/application/explore-service";
import { RecentLevelUps } from "@/modules/explore/presentation/recent-level-ups";
import { SkillHistory } from "@/modules/explore/presentation/skill-history";
import { SkillProfileHeader } from "@/modules/explore/presentation/skill-profile-header";
import { ProfileCards } from "@/modules/explore/presentation/profile-cards";
import { ProfileBadges } from "@/modules/explore/presentation/profile-badges";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { getCareerForActor } from "@/modules/career/application/career-service";
import { CareerPanel } from "@/modules/career/presentation/career-panel";
import { ProfileTabs } from "@/modules/career/presentation/profile-tabs";

export const dynamic = "force-dynamic";

export default async function SkillProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requirePasswordReadyMember();
  const { memberId } = await params;
  const profile = await getSkillProfile(
    { role: session.user.role, memberId: session.user.memberId },
    memberId
  );
  const career = await getCareerForActor(
    { role: session.user.role, memberId: session.user.memberId },
    memberId
  );
  const { tab } = await searchParams;

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
        {career ? (
          <ProfileTabs memberId={memberId} activeTab={tab} />
        ) : null}
        {career && tab === "career" ? (
          <CareerPanel
            memberId={memberId}
            histories={career.projectHistories}
            certifications={career.certifications}
            itCareerStartMonth={career.itCareerStartMonth}
            skillSheetNote={career.skillSheetNote}
          />
        ) : (
          <>
            <ProfileCards profile={profile} isOwner={memberId === session.user.memberId} />
            <ProfileBadges profile={profile} isOwner={memberId === session.user.memberId} />
            <RecentLevelUps items={profile.recent} />
            <SkillHistory name={profile.name} snapshots={profile.snapshots} />
          </>
        )}
      </div>
    </div>
  );
}
