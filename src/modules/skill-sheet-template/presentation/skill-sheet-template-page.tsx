"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadApiFile } from "@/shared/lib/api-client";
import {
  repeatingSkillSheetMarkers,
  singleSkillSheetMarkers
} from "../domain/skill-sheet-markers";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  deleteTemplateAction,
  inspectTemplateAction,
  registerTemplateAction,
  renameTemplateAction,
  replaceTemplateAction
} from "./actions";
import type { getTemplateList } from "../application/skill-sheet-template-service";

type Templates = Awaited<ReturnType<typeof getTemplateList>>;
type Inspection = { known: string[]; unknown: string[]; errors: string[] };

export function SkillSheetTemplatePage({ templates }: { templates: Templates }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [replacement, setReplacement] = useState<{
    id: string;
    file: File;
    inspection: Inspection;
  } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function inspect(next: File | null) {
    setFile(next);
    setInspection(null);
    if (!next) return;
    startTransition(async () => {
      const result = await inspectTemplateAction(next);
      if (result.status === "error") toast.error(result.message);
      else setInspection(result.data ?? null);
    });
  }

  function register() {
    if (!file) return;
    startTransition(async () => {
      const result = await registerTemplateAction(name, file);
      toast[result.status === "success" ? "success" : "error"](result.message);
      if (result.status === "success") {
        setName("");
        setFile(null);
        setInspection(null);
      }
    });
  }

  function rename(id: string, value: string) {
    startTransition(async () => {
      const result = await renameTemplateAction(id, value);
      toast[result.status === "success" ? "success" : "error"](result.message);
    });
  }

  function inspectReplacement(id: string, replacementFile: File | null) {
    setReplacement(null);
    if (!replacementFile) return;
    startTransition(async () => {
      const checked = await inspectTemplateAction(replacementFile);
      if (checked.status === "error" || !checked.data) {
        toast.error(checked.message);
        return;
      }
      setReplacement({ id, file: replacementFile, inspection: checked.data });
    });
  }

  function replace() {
    if (!replacement) return;
    startTransition(async () => {
      const result = await replaceTemplateAction(replacement.id, replacement.file);
      toast[result.status === "success" ? "success" : "error"](result.message);
      if (result.status === "success") setReplacement(null);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-bold">スキルシートのひな形</h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>ひな形</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TemplateRow id="standard" name="TalentHub 標準" />
              {templates.map((template) => (
                <div key={template.id} className="rounded-lg border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{template.name}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        最終更新 {formatDate(template.updatedAt)}・
                        更新者 {template.updatedById ? "登録済み" : "不明"}・使用 {template.useCount}回
                      </p>
                    </div>
                    <DownloadLink id={template.id} />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs font-semibold">
                      名前の変更
                      <input
                        className="min-h-11 rounded-md border border-[var(--border-strong)] px-3 text-sm"
                        defaultValue={template.name}
                        maxLength={50}
                        onBlur={(event) => {
                          if (event.target.value !== template.name) rename(template.id, event.target.value);
                        }}
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold">
                      差し替え
                      <input
                        type="file"
                        accept=".xlsx"
                        onChange={(event) =>
                          inspectReplacement(template.id, event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                  {replacement?.id === template.id ? (
                    <div className="mt-3 space-y-3">
                      <InspectionResult inspection={replacement.inspection} />
                      <Button
                        type="button"
                        disabled={pending || replacement.inspection.errors.length > 0}
                        onClick={replace}
                      >
                        差し替える
                      </Button>
                    </div>
                  ) : null}
                  <Button className="mt-3" type="button" variant="destructive" onClick={() => setDeleteId(template.id)}>
                    削除
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ひな形を登録</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="grid gap-2 text-sm font-semibold">
                名前
                <input
                  className="min-h-11 rounded-md border border-[var(--border-strong)] px-3 font-normal"
                  value={name}
                  maxLength={50}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                ファイル
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => inspect(event.target.files?.[0] ?? null)}
                />
              </label>
              {inspection ? <InspectionResult inspection={inspection} /> : null}
              <Button
                type="button"
                disabled={pending || !file || !name.trim() || !inspection || inspection.errors.length > 0}
                onClick={register}
              >
                登録
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>使える印</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <MarkerGroup title="基本情報" markers={singleSkillSheetMarkers} />
            {Object.entries(repeatingSkillSheetMarkers).map(([group, markers]) => (
              <MarkerGroup
                key={group}
                title={`${group}（行を繰り返す）`}
                markers={markers.map((item) => `${group}.${item}`)}
              />
            ))}
            <div>
              <p className="font-bold">書き方の例</p>
              <div className="mt-2 rounded-lg border border-[var(--border)] p-3">
                <code>{"{{経歴.期間}}"}</code><br />
                <code>{"{{経歴.案件名}}"}</code>
              </div>
            </div>
            <p>「経歴.」で始まる印の行は、経歴の件数だけ繰り返して出力します。罫線や色はひな形のままです。</p>
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          const id = deleteId;
          setDeleteId(null);
          if (!id) return;
          startTransition(async () => {
            const result = await deleteTemplateAction(id);
            toast[result.status === "success" ? "success" : "error"](result.message);
          });
        }}
        title="ひな形を削除しますか"
        description="削除したひな形は元に戻せません。"
        confirmLabel="削除"
        destructive
      />
    </div>
  );
}

function TemplateRow({
  id,
  name
}: {
  id: string;
  name: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
      <p className="font-bold">{name}</p>
      <DownloadLink id={id} />
    </div>
  );
}

function DownloadLink({ id }: { id: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)]"
      onClick={() => void downloadApiFile(`/api/talent/v1/skill-sheet-templates/${id}`)}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      ダウンロード
    </button>
  );
}

function InspectionResult({
  inspection
}: {
  inspection: { known: string[]; unknown: string[]; errors: string[] };
}) {
  return (
    <div className="space-y-1 rounded-lg bg-[var(--surface-subtle)] p-3 text-sm">
      <p className="font-semibold text-[var(--primary)]">
        使える印 {inspection.known.length}個
      </p>
      {inspection.unknown.length > 0 ? (
        <p>
          知らない印 {inspection.unknown.length}個：{inspection.unknown.join("、")}（出力では空欄）
        </p>
      ) : null}
      {inspection.errors.map((error) => (
        <p key={error} className="text-[var(--destructive)]">
          {error}
        </p>
      ))}
    </div>
  );
}

function MarkerGroup({ title, markers }: { title: string; markers: readonly string[] }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {markers.map((marker) => (
          <code
            key={marker}
            className="rounded-md bg-[var(--primary-subtle)] px-1.5 py-0.5 text-xs text-[var(--primary)]"
          >
            {`{{${marker}}}`}
          </code>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium"
  }).format(value);
}
