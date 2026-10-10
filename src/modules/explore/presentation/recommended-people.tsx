import { Target, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { getExploreData } from "@/modules/explore/application/explore-service";
import {
  getMemberAvatarTone,
  getMemberInitial
} from "@/modules/members/presentation/skill-approval";
import { cn } from "@/shared/lib/utils";
import { Tooltip } from "@/shared/ui/tooltip";
import { SectionHeading } from "./section-heading";

type Data = Awaited<ReturnType<typeof getExploreData>>;
const reasonMeta = {
  target: { label: "目標ロールに必要なスキル", Icon: Target },
  trending: { label: "いま伸びている技術", Icon: TrendingUp },
  department: { label: "同じ部署で最近レベルアップ", Icon: Users }
} as const;

export function RecommendedPeople({ people }: { people: Data["recommendations"] }) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="recommended-heading"
    >
      <SectionHeading id="recommended-heading" icon={Users} title="おすすめの人" />
      <div className="mt-4 divide-y divide-[var(--border)]">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}` as Route}
            className="flex min-h-20 items-center gap-3 px-2 py-3 hover:bg-[var(--surface-subtle)]"
          >
            <span
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                getMemberAvatarTone(person.id)
              )}
            >
              {getMemberInitial(person.name)}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">{person.name}</strong>
              <span className="block text-xs text-[var(--muted-foreground)]">
                {person.departmentName}
                {person.jobTitle ? `・${person.jobTitle}` : ""}
              </span>
              <span className="mt-1 flex flex-wrap gap-1">
                {person.strengths.map((skill) => (
                  <span
                    key={skill.name}
                    className="rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--primary)]"
                  >
                    {skill.name} Lv{skill.level}
                  </span>
                ))}
              </span>
            </span>
            <span className="flex gap-1">
              {person.reasons.map((reason) => {
                const { Icon, label } = reasonMeta[reason];
                return (
                  <Tooltip key={reason} content={label}>
                    <span
                      tabIndex={0}
                      aria-label={label}
                      className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </Tooltip>
                );
              })}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
