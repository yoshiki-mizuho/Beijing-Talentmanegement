import Link from "next/link";
import { MessageCircle, Target } from "lucide-react";
import type { getSkillProfile } from "@/modules/explore/application/explore-service";
import { ProfileEditor } from "./profile-editor";
import { SectionHeading } from "./section-heading";
import { SkillStrengths } from "./skill-strengths";

type Profile = NonNullable<Awaited<ReturnType<typeof getSkillProfile>>>;

export function ProfileCards({
  profile,
  isOwner
}: {
  profile: Profile;
  isOwner: boolean;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ChallengeCard profile={profile} isOwner={isOwner} />
      <SkillStrengths top={profile.topSkills} rest={profile.otherSkills} />
      <section
        className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        aria-labelledby="consult-heading"
      >
        <SectionHeading
          id="consult-heading"
          icon={MessageCircle}
          title="こんなことで相談に乗れます"
        />
        {profile.consultTopics.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.consultTopics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        ) : isOwner ? (
          <div className="mt-4">
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              相談に乗れることを登録しましょう
            </p>
            <ProfileEditor profile={profile} compact />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">まだ登録されていません</p>
        )}
        {profile.stats.mentoredThisYearCount ? (
          <p className="mt-auto border-t border-[var(--border)] pt-4 text-sm">
            今年は <strong>{profile.stats.mentoredThisYearCount}人</strong> に教える機会がありました
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ChallengeCard({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  const target = profile.targetRole;
  const percent = target ? Math.round(target.evaluation.achievementRate * 100) : 0;
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      aria-labelledby="challenge-heading"
    >
      <SectionHeading id="challenge-heading" icon={Target} title="いま挑戦中" />
      {!target ? (
        <div className="mt-4 text-sm text-[var(--muted-foreground)]">
          目標ロールはまだありません
          {isOwner ? (
            <>
              <br />
              <Link
                className="mt-3 inline-block font-semibold text-[var(--primary)]"
                href="/dashboard#target-role"
              >
                ダッシュボードで決める
              </Link>
            </>
          ) : null}
        </div>
      ) : target.evaluation.achieved ? (
        <p className="mt-6 text-lg font-bold text-[var(--primary)]">{target.name} 達成</p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-4">
            <svg
              viewBox="0 0 104 104"
              className="h-24 w-24 shrink-0"
              role="img"
              aria-label={`${target.name}まで${percent}%`}
            >
              <circle cx="52" cy="52" r="42" fill="none" stroke="#E6F4F1" strokeWidth="12" />
              <circle
                cx="52"
                cy="52"
                r="42"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="12"
                strokeLinecap={percent > 0 ? "round" : "butt"}
                strokeDasharray={`${percent * 2.64} 264`}
                transform="rotate(-90 52 52)"
              />
              <text
                x="52"
                y="59"
                textAnchor="middle"
                fontSize="20"
                fontWeight="900"
                fill="var(--primary)"
              >
                {percent}%
              </text>
            </svg>
            <div>
              <p className="text-lg font-bold">{target.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                必要 {target.evaluation.requiredCount}つのうち {target.evaluation.satisfiedCount} 達成
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {target.evaluation.missingRequirements.slice(0, 2).map((item) => (
              <li key={item.skillId} className="flex justify-between gap-3">
                <span>{item.skillName}</span>
                <span className="shrink-0 text-[var(--muted-foreground)]">
                  {item.memberLevel === null ? "未保有" : `Lv${item.memberLevel}`} →{" "}
                  <strong className="text-[var(--primary)]">Lv{item.requiredLevel}</strong>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
