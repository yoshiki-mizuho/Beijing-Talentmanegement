import { Star } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { SectionHeading } from "./section-heading";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;

export function SkillStrengths({ skills }: { skills: Profile["skills"] }) {
  const strengths = skills.filter((skill) => skill.level >= 4);
  const others = skills.filter((skill) => skill.level <= 3);
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="strengths-heading"
    >
      <SectionHeading id="strengths-heading" icon={Star} title="得意なスキル" />
      <ul className="mt-4 space-y-4">
        {strengths.map((skill) => (
          <li key={skill.skillId}>
            <div className="mb-1 flex justify-between text-sm">
              <strong>{skill.skillName}</strong>
              <span>Lv{skill.level}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
              <span
                className="block h-full rounded-full bg-[var(--primary)]"
                style={{ width: `${skill.level * 20}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {others.length ? (
        <details className="mt-5">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[var(--primary)]">
            ほか {others.length}件
          </summary>
          <ul className="space-y-2">
            {others.map((skill) => (
              <li key={skill.skillId} className="flex justify-between text-sm">
                <span>{skill.skillName}</span>
                <strong>Lv{skill.level}</strong>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
