import { Compass } from "lucide-react";

import { getExploreData } from "@/modules/explore/application/explore-service";
import { PeopleSearch } from "@/modules/explore/presentation/people-search";
import { RecommendedPeople } from "@/modules/explore/presentation/recommended-people";
import { TrendingSkills } from "@/modules/explore/presentation/trending-skills";
import { requirePasswordReadyMember } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams
}: {
  searchParams: Promise<{ skill?: string; level?: string }>;
}) {
  const session = await requirePasswordReadyMember();
  const query = await searchParams;
  const level = Math.min(5, Math.max(1, Number(query.level) || 1));
  const data = await getExploreData(
    { role: session.user.role, memberId: session.user.memberId },
    { skillId: query.skill, level }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Compass className="h-7 w-7 text-[var(--primary)]" aria-hidden="true" />
        <h1 className="text-[26px] font-bold">探す</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <TrendingSkills items={data.trending} level={level} />
        <RecommendedPeople people={data.recommendations} />
      </div>
      <PeopleSearch data={data} selectedSkill={query.skill} level={level} />
    </div>
  );
}
