"use client";

import {
  MessageCircle,
  MessageCircleQuestion,
  PartyPopper,
  Send,
  Star
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { toast } from "sonner";

import type { LevelUpFeedItem } from "@/modules/growth/application/growth-service";
import { MAX_LEVEL_UP_COMMENT_LENGTH } from "@/modules/growth/domain/growth-schema";
import {
  createLevelUpCommentAction,
  toggleLevelUpReactionAction
} from "@/modules/growth/presentation/actions";
import { formatNotificationDate } from "@/modules/notifications/presentation/notification-date";
import { getMemberAvatarTone, getMemberInitial } from "@/modules/members/presentation/skill-approval";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Tooltip } from "@/shared/ui/tooltip";

type ReactionType = "CONGRATS" | "AMAZING" | "WANT_TO_LEARN";

const reactionDefinitions = [
  { type: "CONGRATS", label: "おめでとう", icon: PartyPopper },
  { type: "AMAZING", label: "すごい", icon: Star },
  { type: "WANT_TO_LEARN", label: "教えてほしい", icon: MessageCircleQuestion }
] as const;

export type SerializableFeedItem = Omit<LevelUpFeedItem, "changedAt" | "comments"> & {
  changedAt: string;
  comments: Array<Omit<LevelUpFeedItem["comments"][number], "createdAt"> & { createdAt: string }>;
};

export function LevelUpFeed({
  items,
  viewer
}: {
  items: SerializableFeedItem[];
  viewer: { memberId: string; memberName: string };
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="この期間のレベルアップはまだありません"
        description="新しい成長が記録されたら、ここからリアクションやコメントを送れます。"
      />
    );
  }

  return (
    <ol className="divide-y divide-[var(--border)]">
      {items.map((item) => (
        <FeedItem key={item.id} initialItem={item} viewer={viewer} />
      ))}
    </ol>
  );
}

function FeedItem({
  initialItem,
  viewer
}: {
  initialItem: SerializableFeedItem;
  viewer: { memberId: string; memberName: string };
}) {
  const [reactions, setReactions] = useState(() =>
    new Map(initialItem.reactions.map((reaction) => [reaction.type, reaction]))
  );
  const [comments, setComments] = useState(initialItem.comments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isOwner = initialItem.memberId === viewer.memberId;

  async function toggleReaction(type: ReactionType) {
    if (isOwner) return;
    const previous = new Map(reactions);
    const current = reactions.get(type) ?? { type, count: 0, reactedByViewer: false };
    const nextPressed = !current.reactedByViewer;
    const next = new Map(reactions);
    next.set(type, {
      ...current,
      count: Math.max(0, current.count + (nextPressed ? 1 : -1)),
      reactedByViewer: nextPressed
    });
    setReactions(next);

    const formData = new FormData();
    formData.set("levelChangeId", initialItem.id);
    formData.set("type", type);
    formData.set("pressed", String(current.reactedByViewer));
    try {
      const result = await toggleLevelUpReactionAction(formData);
      // 成功時はボタンの状態で伝わるため、トーストは失敗時だけ出す
      if (result.status === "error") {
        setReactions(previous);
        toast.error(result.message);
      }
    } catch {
      setReactions(previous);
      toast.error("リアクションを更新できませんでした。時間をおいて再度お試しください。");
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await createLevelUpCommentAction(formData);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setComments((current) => [...current, {
        id: `optimistic-${Date.now()}`,
        authorMemberId: viewer.memberId,
        authorName: viewer.memberName,
        body: body.trim(),
        createdAt: new Date().toISOString()
      }]);
      setBody("");
      toast.success(result.message);
    } catch {
      toast.error("コメントを投稿できませんでした。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="p-5">
      <div className="flex items-start gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold", getMemberAvatarTone(initialItem.memberId))} aria-hidden="true">
          {getMemberInitial(initialItem.memberName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm text-[var(--foreground)]">
              <Link href={`/people/${initialItem.memberId}` as Route} className="font-semibold hover:text-[var(--primary)] hover:underline">{initialItem.memberName} さん</Link>
              が <span className="font-semibold">{initialItem.skillName}</span> を <span className="font-semibold">Lv{initialItem.toLevel}</span> に
            </p>
            <time className="shrink-0 text-xs text-[var(--muted-foreground)]" dateTime={initialItem.changedAt}>
              {formatNotificationDate(new Date(initialItem.changedAt))}
            </time>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {reactionDefinitions.map((definition) => {
              const reaction = reactions.get(definition.type) ?? {
                type: definition.type,
                count: 0,
                reactedByViewer: false
              };
              const tooltip = isOwner
                ? "自分のレベルアップにはリアクションできません"
                : definition.label;
              return (
                <Tooltip key={definition.type} content={tooltip}>
                  <span
                    className="inline-flex"
                    tabIndex={isOwner ? 0 : undefined}
                    aria-label={isOwner ? tooltip : undefined}
                  >
                    <button
                      type="button"
                      aria-label={`${definition.label} ${reaction.count}件`}
                      aria-pressed={reaction.reactedByViewer}
                      disabled={isOwner}
                      onClick={() => void toggleReaction(definition.type)}
                      className={cn(
                        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-45",
                        reaction.reactedByViewer
                          ? "border-teal-200 bg-[var(--primary-subtle)] text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)]"
                      )}
                    >
                      <definition.icon className="h-4 w-4" aria-hidden="true" />
                      <span aria-hidden="true">{reaction.count}</span>
                    </button>
                  </span>
                </Tooltip>
              );
            })}
            <Tooltip content="コメント">
              <button
                type="button"
                aria-label={`コメント ${comments.length}件`}
                aria-expanded={commentsOpen}
                onClick={() => setCommentsOpen((current) => !current)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-[var(--border)] px-3 text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span aria-hidden="true">{comments.length}</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {commentsOpen ? (
        <div className="ml-0 mt-4 rounded-xl bg-[var(--surface-subtle)] p-4 sm:ml-[3.25rem]">
          {comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{comment.authorName}</span>
                    <time className="text-xs text-[var(--muted-foreground)]" dateTime={comment.createdAt}>
                      {formatNotificationDate(new Date(comment.createdAt))}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[var(--foreground)]">{comment.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">最初のコメントを送って、お祝いの気持ちを伝えましょう。</p>
          )}
          <form className="mt-4" onSubmit={submitComment}>
            <input type="hidden" name="levelChangeId" value={initialItem.id} />
            <label className="sr-only" htmlFor={`comment-${initialItem.id}`}>コメント</label>
            <textarea
              id={`comment-${initialItem.id}`}
              name="body"
              maxLength={MAX_LEVEL_UP_COMMENT_LENGTH}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="お祝いのコメントを書く"
              className="min-h-20 w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--muted-foreground)]" aria-live="polite">
                残り {MAX_LEVEL_UP_COMMENT_LENGTH - body.length}文字
              </span>
              <Button type="submit" size="small" className="min-h-11" disabled={!body.trim() || submitting}>
                <Send className="h-4 w-4" aria-hidden="true" />
                {submitting ? "投稿中…" : "投稿"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </li>
  );
}

