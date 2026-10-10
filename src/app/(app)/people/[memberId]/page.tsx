import { getSkillProfile } from "@/modules/explore/application/explore-service";
import { RecentLevelUps } from "@/modules/explore/presentation/recent-level-ups";
import { SkillHistory } from "@/modules/explore/presentation/skill-history";
import { SkillProfileHeader } from "@/modules/explore/presentation/skill-profile-header";
import { SkillStrengths } from "@/modules/explore/presentation/skill-strengths";
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
    <div className="space-y-6">
      <SkillProfileHeader profile={profile} isOwner={memberId === session.user.memberId} />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SkillStrengths skills={profile.skills} />
        </div>
        <div className="lg:col-span-2">
          <RecentLevelUps items={profile.recent} />
        </div>
      </div>
      <SkillHistory name={profile.name} snapshots={profile.snapshots} />
    </div>
  );
}
