"use client";

import { Search, Trash2, WandSparkles, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatSkillPrerequisiteRelationship } from "@/modules/skills/domain/skill-prerequisite";

import {
  createManualSkillPrerequisiteAction,
  createSuggestedSkillPrerequisitesAction,
  deleteSkillPrerequisiteAction,
  generateSkillPrerequisiteSuggestionsAction,
} from "@/modules/skills/presentation/actions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Combobox } from "@/shared/ui/combobox";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";

type Skill = {
  id: string;
  name: string;
  category: { name: string };
  isActive: boolean;
};
type Prerequisite = {
  id: string;
  skillId: string;
  prerequisiteSkillId: string;
  source: "AI_SUGGESTION" | "MANUAL";
  createdAt: Date;
  skill: { id: string; name: string };
  prerequisiteSkill: { id: string; name: string };
};
type Suggestion = {
  skillId: string;
  skillName: string;
  prerequisiteSkillId: string;
  prerequisiteSkillName: string;
  reason: string;
  confidence: "high" | "low";
};

export function SkillPrerequisitesPanel({
  skills,
  prerequisites,
}: {
  skills: Skill[];
  prerequisites: Prerequisite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<"unrelated" | "all">("unrelated");
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [selected, setSelected] = useState(new Set<string>());
  const [notice, setNotice] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [prerequisiteSkillId, setPrerequisiteSkillId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Prerequisite | null>(null);
  const relatedIds = new Set(
    prerequisites.flatMap((item) => [item.skillId, item.prerequisiteSkillId]),
  );
  const activeSkills = skills.filter((skill) => skill.isActive);
  const unrelatedCount = activeSkills.filter(
    (skill) => !relatedIds.has(skill.id),
  ).length;
  const options = activeSkills.map((skill) => ({
    value: skill.id,
    label: skill.name,
    group: skill.category.name,
  }));
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ja");
    return prerequisites.filter(
      (item) =>
        normalized === "" ||
        item.skill.name.toLocaleLowerCase("ja").includes(normalized) ||
        item.prerequisiteSkill.name
          .toLocaleLowerCase("ja")
          .includes(normalized),
    );
  }, [prerequisites, query]);

  function makeSuggestions() {
    startTransition(async () => {
      const result = await generateSkillPrerequisiteSuggestionsAction(scope);
      if (result.status === "error" || !result.data) {
        toast.error(result.message);
        return;
      }
      setSuggestions(result.data.suggestions);
      setSelected(
        new Set(
          result.data.suggestions
            .filter((item) => item.confidence === "high")
            .map(keyOf),
        ),
      );
      setNotice(result.data.message);
      setTruncated(result.data.truncated);
    });
  }

  function registerSuggestions() {
    if (!suggestions) return;
    const pairs = suggestions
      .filter((item) => selected.has(keyOf(item)))
      .map((item) => ({
        skillId: item.skillId,
        prerequisiteSkillId: item.prerequisiteSkillId,
      }));
    startTransition(async () => {
      const result = await createSuggestedSkillPrerequisitesAction({ pairs });
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
      if (result.status === "success") {
        setSuggestions(null);
        router.refresh();
      }
    });
  }

  function registerManual() {
    if (!skillId || !prerequisiteSkillId) return;
    startTransition(async () => {
      const result = await createManualSkillPrerequisiteAction({
        skillId,
        prerequisiteSkillId,
      });
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message);
      if (result.status === "success") {
        setManualOpen(false);
        setSkillId(null);
        setPrerequisiteSkillId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>前提スキルの候補</CardTitle>
            <CardDescription>
              AI に送るのは、スキルの名前・カテゴリ・説明だけです
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium">
              候補を作る範囲
              <select
                className="mt-1 block h-10 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3"
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as "unrelated" | "all")
                }
              >
                <option value="unrelated">
                  関係のないスキルだけ（{unrelatedCount}件）
                </option>
                <option value="all">
                  すべてのスキル（{activeSkills.length}件）
                </option>
              </select>
            </label>
            <Button
              onClick={makeSuggestions}
              disabled={pending}
              className="min-h-11"
            >
              <WandSparkles className="h-4 w-4" aria-hidden="true" />
              {pending ? "候補を作っています…" : "候補を作る"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {truncated ? (
            <p className="mb-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
              多いため一部だけ対象にしました
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {notice}
            </p>
          ) : null}
          {suggestions && !notice ? (
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  前提と言える候補はありませんでした。
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    AI の提案です。確かめてから登録してください。
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setSelected(new Set(suggestions.map(keyOf)))}
                    >
                      すべて選ぶ
                    </Button>
                    <Button variant="secondary" onClick={() => setSelected(new Set())}>
                      すべて外す
                    </Button>
                  </div>
                <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {suggestions.map((item) => {
                    const key = keyOf(item);
                    return (
                      <li key={key} className="flex items-start gap-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={formatSkillPrerequisiteRelationship(
                            item.skillName,
                            item.prerequisiteSkillName
                          )}
                          className="mt-1 h-5 w-5"
                          checked={selected.has(key)}
                          onChange={(event) =>
                            setSelected((current) => {
                              const next = new Set(current);
                              if (event.target.checked) next.add(key);
                              else next.delete(key);
                              return next;
                            })
                          }
                        />
                        <div>
                          <p className="font-medium">
                            {formatSkillPrerequisiteRelationship(
                              item.skillName,
                              item.prerequisiteSkillName
                            )}
                          </p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                            {item.reason}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setSuggestions(null)}
                >
                  候補を閉じる
                </Button>
                <Button
                  disabled={pending || selected.size === 0}
                  onClick={registerSuggestions}
                >
                  選んだ {selected.size}件を登録
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>登録済みの関係（{prerequisites.length}件）</CardTitle>
            <CardDescription>
              申請のレベルが前提スキルより
              2段以上高いと、承認画面に確認ポイントを出します
            </CardDescription>
          </div>
          <Button variant="secondary" onClick={() => setManualOpen(true)}>
            ＋ 手で追加
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {manualOpen ? (
            <div className="grid gap-3 rounded-lg bg-[var(--surface-subtle)] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <Combobox
                id="prerequisite-skill"
                label="スキル"
                options={options}
                value={skillId}
                onChange={setSkillId}
                placeholder="スキル名を入力して選ぶ"
              />
              <Combobox
                id="prerequisite-required"
                label="前提スキル"
                options={options}
                value={prerequisiteSkillId}
                onChange={setPrerequisiteSkillId}
                placeholder="スキル名を入力して選ぶ"
              />
              <div className="flex gap-2">
                <Button
                  onClick={registerManual}
                  disabled={pending || !skillId || !prerequisiteSkillId}
                >
                  登録
                </Button>
                <Button variant="ghost" onClick={() => setManualOpen(false)}>
                  やめる
                </Button>
              </div>
            </div>
          ) : null}
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              aria-label="スキル名で検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9 pr-10"
              placeholder="スキル名で検索"
            />
            {query ? (
              <button
                type="button"
                aria-label="検索をクリア"
                onClick={() => setQuery("")}
                className="absolute right-0 top-0 grid h-10 w-10 place-items-center"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--border)] p-4 text-sm">
                <p className="font-medium">
                  {formatSkillPrerequisiteRelationship(
                    item.skill.name,
                    item.prerequisiteSkill.name
                  )}
                </p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                  <dt className="text-[var(--muted-foreground)]">登録のしかた</dt>
                  <dd>{item.source === "AI_SUGGESTION" ? "AI の候補から" : "手で追加"}</dd>
                  <dt className="text-[var(--muted-foreground)]">登録日</dt>
                  <dd>{formatPrerequisiteDate(item.createdAt)}</dd>
                </dl>
                <Button
                  size="small"
                  variant="ghost"
                  className="mt-3 text-[var(--destructive)]"
                  aria-label={`${item.skill.name}と${item.prerequisiteSkill.name}の関係を削除`}
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </Button>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-[var(--muted-foreground)]">
                  <th className="p-3">スキル</th>
                  <th className="p-3">前提スキル</th>
                  <th className="p-3">登録のしかた</th>
                  <th className="p-3">登録日</th>
                  <th className="p-3 text-right">削除</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium">{item.skill.name}</td>
                    <td className="p-3">{item.prerequisiteSkill.name}</td>
                    <td className="p-3">
                      <Badge>
                        {item.source === "AI_SUGGESTION"
                          ? "AI の候補から"
                          : "手で追加"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {formatPrerequisiteDate(item.createdAt)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`${item.skill.name}と${item.prerequisiteSkill.name}の関係を削除`}
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          startTransition(async () => {
            const result = await deleteSkillPrerequisiteAction(deleteTarget.id);
            if (result.status === "success") toast.success(result.message);
            else toast.error(result.message);
            setDeleteTarget(null);
            if (result.status === "success") router.refresh();
          });
        }}
        title="前提スキルを削除しますか"
        description="この関係を削除します。"
        confirmLabel="削除する"
        destructive
      />
    </div>
  );
}

function keyOf(item: Pick<Suggestion, "skillId" | "prerequisiteSkillId">) {
  return `${item.skillId}:${item.prerequisiteSkillId}`;
}

function formatPrerequisiteDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo"
  }).format(new Date(value));
}
