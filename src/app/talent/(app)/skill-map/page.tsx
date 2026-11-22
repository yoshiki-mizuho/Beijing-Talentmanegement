import Link from "next/link";
import type { Route } from "next";
import { getSkillMapPageData } from "@/modules/skill-map/application/skill-map-service";
import { SkillMapTiles } from "@/modules/skill-map/presentation/skill-map-tiles";
import { requirePageRoles, managerOrAdmin } from "@/server/auth/authorization";

export const dynamic = "force-dynamic";
export default async function SkillMapPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string }>;
}) {
  const session = await requirePageRoles(managerOrAdmin);
  const { node } = await searchParams;
  const { scope, skills, categories } = await getSkillMapPageData(
    session.user.role,
    session.user.memberId,
    node,
  );
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[26px] font-bold">スキルマップ</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {scope.name}・{scope.activeMemberCount}名
        </p>
      </header>
      {session.user.role === "ADMIN" ? (
        <nav aria-label="組織の範囲" className="flex flex-wrap gap-2">
          <Link href="/talent/skill-map" className={chip(!scope.nodeId)}>
            全社
          </Link>
          {scope.nodes.map((item) => (
            <Link
              key={item.id}
              href={`/talent/skill-map?node=${item.id}` as Route}
              className={chip(scope.nodeId === item.id)}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}
      <SkillMapTiles
        skills={skills}
        categories={categories}
        nodeId={scope.nodeId}
      />
    </div>
  );
}
function chip(active: boolean) {
  return `inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold ${active ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-white"}`;
}
