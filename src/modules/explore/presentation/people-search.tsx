import { Compass } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import type { getExploreData } from "@/modules/explore/application/explore-service";
import {
  getMemberAvatarTone,
  getMemberInitial
} from "@/modules/members/presentation/skill-approval";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { SelectField } from "@/shared/ui/form-field";
import { SectionHeading } from "./section-heading";

type Data = Awaited<ReturnType<typeof getExploreData>>;

export function PeopleSearch({
  data,
  selectedSkill,
  level
}: {
  data: Data;
  selectedSkill?: string;
  level: number;
}) {
  return (
    <section
      id="people-search"
      className="scroll-mt-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="people-search-heading"
    >
      <SectionHeading id="people-search-heading" icon={Compass} title="人を探す" />
      <form className="mt-4 flex flex-wrap items-end gap-3">
        <SelectField
          id="explore-skill"
          name="skill"
          label="探すスキル"
          defaultValue={selectedSkill ?? ""}
          className="min-w-56"
        >
          <option value="">選択してください</option>
          {data.skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="explore-minimum-level"
          name="level"
          label="最低レベル"
          defaultValue={String(level)}
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              Lv{value}
            </option>
          ))}
        </SelectField>
        <Button type="submit">探す</Button>
      </form>
      <div className="mt-5">
        {selectedSkill && data.results.length === 0 ? (
          <EmptyState title="条件に合う人はいません" />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {data.results.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/people/${person.id}` as Route}
                  className="flex min-h-16 items-center gap-3 px-2 hover:bg-[var(--surface-subtle)]"
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
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {person.departmentName}
                      {person.jobTitle ? `・${person.jobTitle}` : ""}
                    </span>
                  </span>
                  <strong className="text-[var(--primary)]">Lv{person.level}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
