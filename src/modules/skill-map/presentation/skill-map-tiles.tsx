"use client";
import { X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import type { buildSkillMap } from "@/modules/skill-map/domain/skill-map-matrix";

type Skill = ReturnType<typeof buildSkillMap>[number];
const colors = ["#CCFBF1", "#99F6E4", "#2DD4BF", "#0D9488", "#115E59"];
export function SkillMapTiles({
  skills,
  categories,
}: {
  skills: Skill[];
  categories: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("");
  const visible = useMemo(
    () =>
      skills.filter(
        (skill) =>
          (!category || skill.category.id === category) &&
          skill.name
            .toLocaleLowerCase("ja")
            .includes(query.trim().toLocaleLowerCase("ja")),
      ),
    [skills, query, category],
  );
  const maxHolderCount = Math.max(0, ...skills.map((skill) => skill.holderCount));
  const [selectedId, setSelectedId] = useState(skills[0]?.id ?? "");
  const selected =
    skills.find((skill) => skill.id === selectedId) ?? visible[0] ?? skills[0];
  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="relative">
          <input
            ref={searchInputRef}
            aria-label="スキルを探す"
            placeholder="スキルを探す"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 rounded-full border border-[var(--border)] bg-white px-4 pr-10 text-sm"
          />
          {query ? (
            <button
              type="button"
              aria-label="検索をクリア"
              className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              onClick={() => {
                setQuery("");
                searchInputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={chip(!category)}
          onClick={() => setCategory("")}
        >
          すべて
        </button>
        {categories.map((item) => (
          <button
            type="button"
            key={item.id}
            className={chip(category === item.id)}
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5">
          <div className="mb-4 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
            <span>大きさ：保有者の数</span>
            <span className="flex items-center gap-2">
              色：組織内での強さ（平均レベルの順位）{" "}
              <span className="flex gap-0.5" aria-hidden="true">
                {colors.map((color) => (
                  <i
                    key={color}
                    className="h-2.5 w-5 rounded-sm"
                    style={{ background: color }}
                  />
                ))}
              </span>{" "}
              下位 → 上位20%
            </span>
            <span>
              <b className="rounded-full bg-white px-1 text-[var(--primary)]">
                ↑
              </b>{" "}
              直近90日で伸びている
            </span>
          </div>
          {categories.map((group) => {
            const items = visible.filter(
              (skill) => skill.category.id === group.id,
            );
            return items.length ? (
              <div key={group.id} className="mt-4">
                <h2 className="mb-2 text-xs font-bold text-[var(--muted-foreground)]">
                  {group.name}
                </h2>
                <div className="grid grid-flow-row-dense auto-rows-[minmax(72px,auto)] grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-6">
                  {items.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={selected?.id === skill.id}
                      onClick={() => setSelectedId(skill.id)}
                      className={`relative flex min-w-0 flex-col justify-between gap-1 rounded-lg p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${skill.holderCount === 0 ? "text-[var(--muted-foreground)]" : skill.strength >= 4 ? "text-white" : "text-teal-950"} ${selected?.id === skill.id ? "outline-3 outline-amber-500" : ""}`}
                      style={{
                        // 保有者がいないスキルは強さの色を付けず、灰色で区別する
                        background:
                          skill.holderCount === 0
                            ? "var(--surface-subtle)"
                            : colors[skill.strength - 1],
                        ...getTileSpan(skill.holderCount, maxHolderCount)
                      }}
                    >
                      <strong
                        className={`line-clamp-2 break-words text-sm ${skill.growthCount ? "pr-10" : ""}`}
                      >
                        {skill.name}
                      </strong>
                      <span className="text-xs">
                        {skill.holderCount === 0
                          ? "保有者なし"
                          : `${skill.holderCount}名・平均Lv${skill.averageLevel.toFixed(1)}`}
                      </span>
                      {skill.growthCount ? (
                        <em className="absolute right-2 top-2 rounded-full bg-white px-1.5 text-xs font-bold not-italic text-[var(--primary)]">
                          ↑ {skill.growthCount}
                        </em>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null;
          })}
        </section>
        {selected ? (
          <SkillDetail skill={selected} />
        ) : (
          <aside className="rounded-2xl border border-[var(--border)] bg-white p-5">
            表示できるスキルがありません
          </aside>
        )}
      </div>
    </>
  );
}
function SkillDetail({ skill }: { skill: Skill }) {
  const [all, setAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const holders = skill.holders
    .filter((item) => all || item.level >= 4)
    .sort((a, b) => b.level - a.level);
  const shown = expanded ? holders : holders.slice(0, 10);
  const max = Math.max(1, ...skill.levelCounts.map((item) => item.count));
  return (
    <aside
      className="rounded-2xl border border-[var(--border)] bg-white p-5"
      aria-label={`${skill.name} の詳細`}
    >
      <div className="flex items-baseline gap-2">
        <h2 className="text-xl font-bold">{skill.name}</h2>
        <span className="text-xs text-[var(--muted-foreground)]">
          {skill.category.name}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          [skill.holderCount, "保有者"],
          [
            skill.rank ? `${skill.rank}位` : "対象外",
            `強さ（全${skill.totalRanked}スキル中）`,
          ],
          [`↑ ${skill.growthCount}`, "直近90日"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-xl bg-[var(--surface-subtle)] p-2"
          >
            <b className="text-xl">{value}</b>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {label}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {skill.levelCounts.map((item) => (
          <div
            key={item.level}
            className="grid grid-cols-[36px_1fr_28px] items-center gap-2 text-xs"
          >
            <span>Lv{item.level}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-[var(--muted)]">
              <span
                className="block h-full rounded-full bg-[var(--primary)]"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </span>
            <span>{item.count}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={chip(!all)}
          aria-pressed={!all}
          onClick={() => setAll(false)}
        >
          Lv4以上
        </button>
        <button
          type="button"
          className={chip(all)}
          aria-pressed={all}
          onClick={() => setAll(true)}
        >
          すべて
        </button>
      </div>
      <div className="mt-2">
        {shown.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="flex items-center gap-3 border-t border-[var(--border)] py-2.5 text-sm"
          >
            <MemberAvatar
              memberId={person.id}
              name={person.name}
              avatarUpdatedAt={person.avatarUpdatedAt}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <b>{person.name}</b>
              <span className="block truncate text-xs text-[var(--muted-foreground)]">
                {person.jobTitle ?? "役職未設定"}
              </span>
            </span>
            <b className="text-[var(--primary)]">Lv{person.level}</b>
          </Link>
        ))}
        {holders.length > 10 && !expanded ? (
          <button
            type="button"
            className="mt-2 text-sm font-bold text-[var(--primary)]"
            onClick={() => setExpanded(true)}
          >
            ほか {holders.length - 10}名を表示
          </button>
        ) : null}
      </div>
    </aside>
  );
}
// 面の大きさは、表示範囲で最も保有者が多いスキルとの比で3段階にする（人数の絶対値では組織の規模で差が出ないため）
export function getTileSpan(holderCount: number, maxHolderCount: number) {
  const ratio = maxHolderCount > 0 ? holderCount / maxHolderCount : 0;
  if (holderCount >= 3 && ratio >= 0.75) return { gridColumn: "span 2", gridRow: "span 2" };
  if (holderCount >= 2 && ratio >= 0.4) return { gridColumn: "span 2", gridRow: "span 1" };
  return { gridColumn: "span 1", gridRow: "span 1" };
}

function chip(active: boolean) {
  return `min-h-9 rounded-full border px-3 text-sm ${active ? "border-[var(--primary)] bg-[var(--primary)] font-bold text-white" : "border-[var(--border)] bg-white"}`;
}
