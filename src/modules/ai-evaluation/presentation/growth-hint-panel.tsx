"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { GrowthHintView } from "@/modules/ai-evaluation/application/growth-hint-service";
import {
  generateGrowthHintAction,
  getGrowthHintAction,
} from "@/modules/ai-evaluation/presentation/actions";
import {
  createOneOnOneNoteAction,
  listOneOnOneNotesAction,
} from "@/modules/growth/presentation/actions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export function GrowthHintPanel({
  memberId,
  panelId,
  tabId,
  onGenerated,
}: {
  memberId: string;
  panelId: string;
  tabId: string;
  onGenerated: () => void;
}) {
  const [hint, setHint] = useState<GrowthHintView | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState(false);
  const [addedTopics, setAddedTopics] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    void getGrowthHintAction(memberId).then(async (value) => {
      if (!active) return;
      setHint(value);
      setLoading(false);
      if (value?.canAddOneOnOneNotes) {
        const notes = await listOneOnOneNotesAction(memberId);
        if (active) setAddedTopics(new Set(notes.map((note) => note.body)));
      }
    });
    return () => {
      active = false;
    };
  }, [memberId]);

  function generate() {
    setFailure(false);
    startTransition(async () => {
      try {
        const result = await generateGrowthHintAction(memberId);
        setHint(result.hint);
        setFailure(result.keptPrevious);
        onGenerated();
        if (!result.keptPrevious) {
          toast.success(result.message ?? "育成のヒントを作りました。");
        }
      } catch {
        setFailure(true);
        toast.error("育成のヒントを作れませんでした。");
      }
    });
  }

  async function addTopic(topic: string) {
    const formData = new FormData();
    formData.set("memberId", memberId);
    formData.set("body", topic);
    const result = await createOneOnOneNoteAction(formData);
    if (result.status === "success") {
      setAddedTopics((current) => new Set(current).add(topic));
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <section
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      className="space-y-5"
    >
      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
          読み込み中…
        </p>
      ) : !hint ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center">
          <h3 className="font-semibold">
            成長を支える会話のきっかけを作ります
          </h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            承認済みのスキルと目標ロールをもとに整理します。
          </p>
          <Button
            type="button"
            className="mt-5"
            onClick={generate}
            disabled={pending}
          >
            ヒントを作る
          </Button>
        </div>
      ) : (
        <HintContent
          hint={hint}
          failure={failure}
          pending={pending}
          addedTopics={addedTopics}
          onGenerate={generate}
          onAddTopic={addTopic}
        />
      )}
      {pending ? (
        <div
          aria-busy="true"
          className="rounded-lg bg-[var(--surface-subtle)] p-4 text-center text-sm"
        >
          <p className="font-semibold">育成のヒントを作っています</p>
          <p className="text-[var(--muted-foreground)]">
            数秒〜30秒ほどかかります。
          </p>
        </div>
      ) : null}
    </section>
  );
}

function HintContent({
  hint,
  failure,
  pending,
  addedTopics,
  onGenerate,
  onAddTopic,
}: {
  hint: GrowthHintView;
  failure: boolean;
  pending: boolean;
  addedTopics: Set<string>;
  onGenerate: () => void;
  onAddTopic: (topic: string) => Promise<void>;
}) {
  const fallback = hint.source === "FALLBACK";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge>
            {!fallback ? (
              <Sparkles aria-hidden className="mr-1 h-3 w-3" />
            ) : null}
            {fallback ? "簡易版（AI なし）" : "AI"}
          </Badge>
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatDateTime(hint.generatedAt)}作成
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onGenerate}
          disabled={pending}
        >
          作り直す
        </Button>
      </div>
      {hint.isStale ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          スキルや目標ロールが変わりました。 作り直せます。
        </p>
      ) : null}
      {failure ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>作り直しに失敗しました。前回のヒントを表示しています。</span>
          <Button type="button" variant="secondary" onClick={onGenerate}>
            もう一度試す
          </Button>
        </div>
      ) : null}
      <HintSection title="得意なこと" icon={Star}>
        <p className="text-sm">{hint.content.strengthsSummary}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {hint.content.strengths.map((skill) => (
            <li key={skill.skillId}>
              <Badge>
                {skill.name} Lv{skill.level}
              </Badge>
            </li>
          ))}
        </ul>
      </HintSection>
      <HintSection title="目標ロールまでに伸ばすとよいスキル" icon={Target}>
        {hint.content.targetRoleName ? (
          <p className="mb-3 text-xs text-[var(--muted-foreground)]">
            {hint.content.targetRoleName}・あと {hint.content.skillGaps.length} スキル
          </p>
        ) : null}
        {!hint.content.targetRoleName ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            目標ロールが未設定です
          </p>
        ) : hint.content.skillGaps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            必須スキルの条件を満たしています。
          </p>
        ) : (
          <ul className="space-y-3">
            {hint.content.skillGaps.map((gap) => (
              <li key={gap.skillId}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{gap.name}</span>
                  <span>
                    Lv{gap.currentLevel} → Lv{gap.requiredLevel}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full bg-[var(--primary)]"
                    style={{
                      width: `${(gap.currentLevel / gap.requiredLevel) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </HintSection>
      <HintSection title="次の一歩" icon={ArrowRight}>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {hint.content.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        {hint.content.mentor ? (
          <p className="mt-4 text-sm">
            教えてもらえそうな人：
            <Link
              href={`/people/${hint.content.mentor.memberId}`}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              {hint.content.mentor.name}
            </Link>
          </p>
        ) : null}
      </HintSection>
      <HintSection title="1on1 で話すとよい話題" icon={MessageSquare}>
        <ul className="space-y-3">
          {hint.content.oneOnOneTopics.map((topic) => (
            <li
              key={topic}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <span>{topic}</span>
              {hint.canAddOneOnOneNotes ? (
                addedTopics.has(topic) ? (
                  <span className="font-semibold text-[var(--primary)]">
                    ✓ 追加済み
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void onAddTopic(topic)}
                  >
                    ＋ 1on1 メモに追加
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      </HintSection>
      <p className="text-xs text-[var(--muted-foreground)]">
        承認済みのスキルと目標ロールをもとに作った参考情報です。
        人事評価には使いません。
      </p>
    </div>
  );
}

function HintSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Icon aria-hidden className="h-4 w-4 text-[var(--primary)]" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
