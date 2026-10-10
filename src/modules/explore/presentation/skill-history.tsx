import { ChevronsUp, Clock3, Sparkles } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { Badge } from "@/shared/ui/badge";
import { Tooltip } from "@/shared/ui/tooltip";
import { SectionHeading } from "./section-heading";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;

export function SkillHistory({
  name,
  snapshots
}: {
  name: string;
  snapshots: Profile["snapshots"];
}) {
  if (snapshots.length === 0) return null;
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="history-heading"
    >
      <SectionHeading id="history-heading" icon={Clock3} title={`これまでの${name}さん`} />
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {snapshots.map((snapshot) => (
          <article key={snapshot.at} className="rounded-xl border border-[var(--border)] p-4">
            <h3 className="font-bold">{snapshot.yearsAgo}年前</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {snapshot.roles.map((role) => (
                <Badge key={role} variant="primary">
                  {role}
                </Badge>
              ))}
            </div>
            <ul className="mt-4 space-y-3">
              {snapshot.skills.map((skill) => (
                <li key={skill.skillId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    {skill.marker?.type === "new" ? (
                      <Tooltip content="新しく習得">
                        <span tabIndex={0} aria-label="新しく習得">
                          <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        </span>
                      </Tooltip>
                    ) : skill.marker?.type === "up" ? (
                      <Tooltip content={`Lv${skill.marker.fromLevel} → Lv${skill.level}`}>
                        <span
                          tabIndex={0}
                          aria-label={`レベルアップ Lv${skill.marker.fromLevel}からLv${skill.level}`}
                        >
                          <ChevronsUp
                            className="h-4 w-4 text-[var(--primary)]"
                            aria-hidden="true"
                          />
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="w-4" />
                    )}
                    {skill.skillName}
                  </span>
                  <strong>Lv{skill.level}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
