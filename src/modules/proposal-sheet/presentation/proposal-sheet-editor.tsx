"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatCareerMonth } from "@/modules/career/domain/career-display";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { generateProposalSheetAction, saveProposalSheetAction } from "./actions";
import type { getProposalSheet } from "../application/proposal-sheet-service";

type Data = Awaited<ReturnType<typeof getProposalSheet>>;
type Draft = NonNullable<Data["draft"]>;
type Project = Data["projects"][number];

const SKILL_PREVIEW_COUNT = 10;
const inputClass =
  "w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-normal";

export function ProposalSheetEditor({ data }: { data: Data }) {
  const initial = data.draft;
  const [displayName, setDisplayName] = useState(
    initial?.displayName ?? data.initialDisplayName
  );
  const [customerRequest, setCustomerRequest] = useState(initial?.customerRequest ?? "");
  const [selectedProjects, setSelectedProjects] = useState(
    () => new Set(initial?.projectHistoryIds ?? data.projects.map((item) => item.id))
  );
  const [excludedSkills, setExcludedSkills] = useState(
    () => new Set(initial?.excludedSkillIds ?? [])
  );
  const [draft, setDraft] = useState<Draft | null>(initial);
  const [selfPr, setSelfPr] = useState(initial?.selfPr ?? "");
  const [strengths, setStrengths] = useState(initial?.strengths ?? "");
  const [descriptions, setDescriptions] = useState<Record<string, string>>(
    initial?.projectDescriptions ?? {}
  );
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const includedSkills = data.skills.filter((skill) => !excludedSkills.has(skill.id));
  const includedProjects = data.projects.filter((project) => selectedProjects.has(project.id));
  const visibleSkills = showAllSkills
    ? data.skills
    : data.skills.slice(0, SKILL_PREVIEW_COUNT);

  function generate() {
    startTransition(async () => {
      const result = await generateProposalSheetAction({
        memberId: data.member.id,
        displayName,
        customerRequest,
        projectHistoryIds: [...selectedProjects],
        excludedSkillIds: [...excludedSkills]
      });
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
      if (result.status !== "success" || !result.data?.draft) return;
      const next = result.data.draft as Draft;
      setDraft(next);
      setSelfPr(next.selfPr);
      setStrengths(next.strengths);
      setDescriptions(next.projectDescriptions);
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveProposalSheetAction({
        memberId: data.member.id,
        displayName,
        customerRequest,
        projectHistoryIds: [...selectedProjects],
        excludedSkillIds: [...excludedSkills],
        selfPr,
        strengths,
        projectDescriptions: descriptions
      });
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function requestGenerate() {
    if (draft) setConfirmOpen(true);
    else generate();
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/members?memberId=${data.member.id}`}
          className="text-sm font-semibold text-[var(--primary)]"
        >
          ← {data.member.name}の詳細
        </Link>
        <h1 className="mt-2 text-[26px] font-bold">提案用スキルシート</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>顧客に見せる情報</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="grid gap-2 text-sm font-semibold">
                表示名
                <input
                  className={`${inputClass} min-h-11`}
                  maxLength={20}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>顧客の要望（任意）</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="grid gap-2 text-sm font-semibold">
                <span className="sr-only">顧客の要望（顧客名は書かない）</span>
                <textarea
                  className={`${inputClass} min-h-28 py-2`}
                  placeholder="顧客名は書かない"
                  maxLength={2000}
                  value={customerRequest}
                  onChange={(event) => setCustomerRequest(event.target.value)}
                />
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>載せる経歴</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.projects.length === 0 ? (
                <EmptyState title="経歴はまだありません">
                  <Link
                    className="text-sm font-semibold text-[var(--primary)]"
                    href={`/people/${data.member.id}?tab=career`}
                  >
                    経歴・資格を登録する
                  </Link>
                </EmptyState>
              ) : (
                data.projects.map((project) => (
                  <label key={project.id} className="flex gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project.id)}
                      onChange={() => setSelectedProjects(toggle(selectedProjects, project.id))}
                    />
                    <span>
                      <strong className="block">{project.title}</strong>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {formatPeriod(project)}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>載せるスキル</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleSkills.map((skill) => (
                <label key={skill.id} className="flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={!excludedSkills.has(skill.id)}
                    onChange={() => setExcludedSkills(toggle(excludedSkills, skill.id))}
                  />
                  <span>
                    <b className="text-[var(--primary)]">Lv{skill.level}</b> {skill.name}
                  </span>
                </label>
              ))}
              {data.skills.length > SKILL_PREVIEW_COUNT ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--primary)]"
                  onClick={() => setShowAllSkills(!showAllSkills)}
                >
                  {showAllSkills ? "折りたたむ" : `すべて表示（${data.skills.length}件）`}
                </button>
              ) : null}
            </CardContent>
          </Card>
          <Button
            type="button"
            className="min-h-12 w-full"
            disabled={pending}
            onClick={requestGenerate}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {pending ? "作成中…" : draft ? "AI で下書きを作り直す" : "AI で下書きを作る"}
          </Button>
        </div>
        <Card>
          <CardContent className="pt-5">
            {!draft ? (
              <EmptyState icon={FileText} title="下書きはまだありません" />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{displayName || "表示名なし"}</h2>
                    {data.experienceLabel ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        IT 経験 {data.experienceLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-[var(--muted-foreground)]">
                    <p>
                      {sourceLabel(draft.source)}
                      {draft.generatedAt ? `・${formatDate(draft.generatedAt)}` : ""}
                    </p>
                    {draft.isStale ? (
                      <span className="mt-1 inline-flex rounded-full bg-[var(--primary-subtle)] px-2 py-1 font-semibold text-[var(--primary)]">
                        元の情報が更新されています
                      </span>
                    ) : null}
                  </div>
                </div>
                <label className="grid gap-2 text-sm font-semibold">
                  自己 PR
                  <textarea
                    className={`${inputClass} min-h-36 py-2 leading-relaxed`}
                    maxLength={800}
                    value={selfPr}
                    onChange={(event) => setSelfPr(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  得意分野
                  <input
                    className={`${inputClass} min-h-11`}
                    maxLength={200}
                    value={strengths}
                    onChange={(event) => setStrengths(event.target.value)}
                  />
                </label>
                <section>
                  <h3 className="mb-3 text-sm font-bold">スキル</h3>
                  <div className="grid gap-2 text-sm sm:grid-cols-3">
                    {includedSkills.map((skill) => (
                      <span key={skill.id}>
                        {skill.name}{" "}
                        <b className="text-[var(--primary)]">Lv{skill.level}</b>
                      </span>
                    ))}
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-sm font-bold">案件の経歴</h3>
                  {includedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="rounded-lg border border-[var(--border)] p-4"
                    >
                      <h4 className="font-bold">{project.title}</h4>
                      <p className="mt-1 text-xs font-semibold text-[var(--primary)]">
                        {formatPeriod(project)}・{project.industry}・{project.role}・{project.teamSize}
                      </p>
                      <textarea
                        aria-label={`${project.title}の説明文`}
                        className={`${inputClass} mt-3 min-h-28 py-2 leading-relaxed`}
                        maxLength={500}
                        value={descriptions[project.id] ?? project.summary}
                        onChange={(event) =>
                          setDescriptions({
                            ...descriptions,
                            [project.id]: event.target.value
                          })
                        }
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[...project.phases, ...project.technologies].map((value) => (
                          <span
                            key={value}
                            className="rounded-full bg-[var(--primary-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
                {data.certifications.length > 0 ? (
                  <section>
                    <h3 className="mb-3 text-sm font-bold">資格</h3>
                    <ul className="space-y-2 text-sm">
                      {data.certifications.map((item) => (
                        <li key={item.id}>
                          {item.name}
                          {item.acquiredMonth
                            ? `（${formatCareerMonth(item.acquiredMonth)}）`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <div className="flex justify-end">
                  <Button type="button" disabled={pending} onClick={save}>
                    保存
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          generate();
        }}
        title="下書きを作り直しますか"
        description="今の下書きを AI の下書きで置き換えますか"
        confirmLabel="置き換える"
      />
    </div>
  );
}

function toggle(values: Set<string>, id: string) {
  const next = new Set(values);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function formatPeriod(project: Project) {
  const end = project.endMonth ? formatCareerMonth(project.endMonth) : "現在";
  return `${formatCareerMonth(project.startMonth)}〜${end}`;
}

function sourceLabel(source: string) {
  if (source === "AI") return "AI の下書き";
  if (source === "FALLBACK") return "簡易版の下書き";
  return "手で作成";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
