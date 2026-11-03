import { Star } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { SectionHeading } from "./section-heading";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;
type Skill = Profile["topSkills"][number];

export function SkillStrengths({ top, rest }: { top: Skill[]; rest: Skill[] }) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="strengths-heading"
    >
      <SectionHeading id="strengths-heading" icon={Star} title="得意なスキル" />
      {top.length ? (
        <SkillList skills={top} />
      ) : (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          まだスキルが登録されていません
        </p>
      )}
      {rest.length ? (
        <details className="mt-2">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[var(--primary)]">
            ほか {rest.length} 件
          </summary>
          <SkillList skills={rest} />
        </details>
      ) : null}
    </section>
  );
}

function SkillList({ skills }: { skills: Skill[] }) {
  return (
    <ul className="mt-3 divide-y divide-[var(--border)]">
      {skills.map((skill) => (
        <li
          key={skill.skillId}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2"
        >
          <span className="min-w-0">
            <strong className="block truncate text-sm">{skill.skillName}</strong>
            <span className="text-xs text-[var(--muted-foreground)]">
              {skill.categoryName}
            </span>
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((level) => (
              <span
                key={level}
                className={`h-2 w-3 rounded-sm ${level <= skill.level ? "bg-[var(--primary)]" : "bg-[#E6F4F1]"}`}
              />
            ))}
          </span>
          <strong className="text-sm text-[var(--primary)]">Lv{skill.level}</strong>
        </li>
      ))}
    </ul>
  );
}
