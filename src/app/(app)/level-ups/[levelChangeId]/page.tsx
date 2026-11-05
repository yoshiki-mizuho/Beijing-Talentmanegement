import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";

import { getLevelUpThread } from "@/modules/growth/application/growth-service";
import { LevelUpFeed } from "@/modules/growth/presentation/level-up-feed";
import { getCurrentSession } from "@/server/auth/session";
import { MemberAvatar } from "@/shared/ui/member-avatar";
import { PageHeader } from "@/shared/ui/page-header";

export const dynamic = "force-dynamic";

export default async function LevelUpThreadPage({
  params
}: {
  params: Promise<{ levelChangeId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session?.user.memberId) redirect("/login");
  const { levelChangeId } = await params;
  const thread = await getLevelUpThread(levelChangeId, {
    memberId: session.user.memberId,
    role: session.user.role
  });
  if (!thread) notFound();

  const reactionTypes = ["CONGRATS", "AMAZING", "WANT_TO_LEARN"] as const;
  const reactions = reactionTypes.map((type) => {
    const matches = thread.reactions.filter((reaction) => reaction.type === type);
    return {
      type,
      count: matches.length,
      reactedByViewer: matches.some((reaction) => reaction.memberId === session.user.memberId),
      memberNames: matches.map((reaction) => reaction.member.name)
    };
  });
  const changedAt = thread.changedAt.toISOString();

  return (
    <div className="space-y-5">
      <PageHeader title="レベルアップ" />
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-5">
          <MemberAvatar
            memberId={thread.member.id}
            name={thread.member.name}
            avatarUpdatedAt={thread.member.avatarUpdatedAt?.toISOString() ?? null}
            href={`/people/${thread.member.id}`}
          />
          <div className="min-w-0">
            <Link
              href={`/people/${thread.member.id}` as Route}
              className="font-semibold hover:text-[var(--primary)] hover:underline"
            >
              {thread.member.name}さん
            </Link>
            <p className="text-sm text-[var(--muted-foreground)]">
              {thread.skill.name}・{thread.skill.category.name}・
              {thread.fromLevel === null ? "未登録" : `Lv${thread.fromLevel}`} → Lv{thread.toLevel}
            </p>
            <time className="text-xs text-[var(--muted-foreground)]" dateTime={changedAt}>
              {new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeZone: "Asia/Tokyo" }).format(thread.changedAt)}
            </time>
          </div>
        </div>
        <LevelUpFeed
          detail
          viewer={{ memberId: session.user.memberId, memberName: session.user.name ?? "" }}
          items={[{
            id: thread.id,
            memberId: thread.memberId,
            memberName: thread.member.name,
            avatarUpdatedAt: thread.member.avatarUpdatedAt?.toISOString() ?? null,
            skillName: thread.skill.name,
            toLevel: thread.toLevel,
            changedAt,
            reactions,
            comments: thread.comments.map((comment) => ({
              id: comment.id,
              authorMemberId: comment.authorMemberId,
              authorName: comment.authorMember.name,
              authorAvatarUpdatedAt: comment.authorMember.avatarUpdatedAt?.toISOString() ?? null,
              body: comment.body,
              createdAt: comment.createdAt.toISOString()
            }))
          }]}
        />
      </section>
    </div>
  );
}
