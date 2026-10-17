"use client";

import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { CsvImportTarget } from "../domain/csv-import-columns";
import { formatImportChanges } from "../domain/import-change-format";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

type Change = {
  row: number;
  kind: "new" | "update" | "unchanged";
  code: string;
  name: string;
  changes: Record<string, { before: unknown; after: unknown }>;
};
type Preview = {
  totalRows: number;
  summary: {
    created: number;
    updated: number;
    unchanged: number;
    errors: number;
  };
  changes: Change[];
  errors: Array<{ row: number; column: string; message: string }>;
  previewToken: string;
};

const labels: Record<CsvImportTarget, string> = {
  departments: "部署",
  members: "メンバー",
  skills: "スキル",
  "member-skills": "メンバースキル",
};

export function CsvImportPanel() {
  const input = useRef<HTMLInputElement>(null);
  const errorTable = useRef<HTMLElement>(null);
  const [target, setTarget] = useState<CsvImportTarget>("departments");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filter, setFilter] = useState<"all" | Change["kind"]>("all");
  const [visible, setVisible] = useState(50);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
  } | null>(null);

  async function selectFile(selected: File | undefined) {
    if (!selected) {
      return;
    }
    setBusy(true);
    setMessage("");
    setFile(selected);
    setResult(null);
    try {
      const response = await fetch(`/api/csv/import/${target}/preview`, {
        method: "POST",
        body: await selected.arrayBuffer(),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "CSVを確認できませんでした");
      }
      setPreview(body);
    } catch (error) {
      setPreview(null);
      setMessage(
        error instanceof Error ? error.message : "CSVを確認できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!file || !preview) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/csv/import/${target}/commit`, {
        method: "POST",
        headers: {
          "x-preview-token": preview.previewToken,
          "x-file-name": encodeURIComponent(file.name),
        },
        body: await file.arrayBuffer(),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "CSVを登録できませんでした");
      }
      setResult({ created: body.created, updated: body.updated });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "CSVを登録できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setMessage("");
    setFilter("all");
    setVisible(50);
    if (input.current) {
      input.current.value = "";
    }
  }

  const step = result ? 3 : preview ? 2 : 1;
  if (result) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-[var(--primary)]"
          aria-hidden="true"
        />
        <h2 className="mt-3 text-lg font-semibold">登録しました</h2>
        <p className="mt-2">
          新規 {result.created}件・更新 {result.updated}件
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            className="inline-flex h-10 items-center rounded-lg border border-[var(--border-strong)] px-4 text-sm font-semibold"
            href="/audit-logs?period=today&target=csv"
          >
            監査ログを見る
          </Link>
          <Button onClick={reset}>続けて取り込む</Button>
        </div>
      </div>
    );
  }
  const shown = (preview?.changes ?? []).filter(
    (change) => filter === "all" || change.kind === filter,
  );
  const registerCount =
    (preview?.summary.created ?? 0) + (preview?.summary.updated ?? 0);
  return (
    <div className="space-y-5">
      <ol className="flex items-center gap-2 text-sm" aria-label="取り込み手順">
        {["ファイルを選ぶ", "確認", "登録"].map((label, index) => (
          <li
            key={label}
            className={cn(
              "rounded-full px-3 py-2",
              step === index + 1
                ? "bg-[var(--primary)] text-white"
                : "bg-[var(--surface-subtle)] text-[var(--muted-foreground)]",
            )}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        {(["departments", "members", "skills", "member-skills"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={target === value}
            onClick={() => {
              setTarget(value);
              reset();
            }}
            className={cn(
              "min-h-11 rounded-full border px-5 text-sm font-semibold",
              target === value
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-white",
            )}
          >
            {labels[value]}
          </button>
        ))}
      </div>
      {!preview ? (
        <div
          className={cn(
            "rounded-2xl border border-dashed bg-[var(--surface)] p-8 text-center",
            dragging
              ? "border-[var(--primary)] bg-[var(--primary-soft)]"
              : "border-[var(--border-strong)]",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void selectFile(event.dataTransfer.files[0]);
          }}
        >
          <Upload
            className="mx-auto h-10 w-10 text-[var(--primary)]"
            aria-hidden="true"
          />
          <input
            ref={input}
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            aria-label={`${labels[target]}のCSVファイル`}
            className="sr-only"
            disabled={busy}
            onChange={(event) => void selectFile(event.target.files?.[0])}
          />
          <p className="mt-4 font-semibold">
            {labels[target]}のCSVファイルをここにドロップ
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            ファイルを選ぶ
          </Button>
          <a
            href={`/api/csv/template/${target}`}
            download
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--primary)]"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            ひな形をダウンロード
          </a>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white p-4">
            <p className="text-sm">
              <span className="font-semibold">{file?.name}</span>　
              {preview.totalRows}行
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={`/api/csv/template/${target}`}
                download
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--primary)]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                ひな形をダウンロード
              </a>
              <Button variant="secondary" onClick={reset}>
                選び直す
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["new", "新規", preview.summary.created],
                ["update", "更新", preview.summary.updated],
                ["unchanged", "変更なし", preview.summary.unchanged],
                ["errors", "エラー", preview.summary.errors],
              ] as const
            ).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={value !== "errors" && filter === value}
                onClick={() => {
                  if (value === "errors") {
                    errorTable.current?.scrollIntoView({ behavior: "smooth" });
                    return;
                  }
                  setFilter(value);
                  setVisible(50);
                }}
                className={cn(
                  "min-h-20 rounded-2xl border bg-white p-3 text-left",
                  value !== "errors" && filter === value
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20"
                    : "border-[var(--border)]",
                )}
              >
                <span className="text-xs text-[var(--muted-foreground)]">
                  {label}
                </span>
                <strong
                  className={cn(
                    "mt-1 block text-2xl",
                    value === "errors" && count > 0
                      ? "text-[var(--destructive)]"
                      : "",
                  )}
                >
                  {count}
                </strong>
              </button>
            ))}
          </div>
          {preview.errors.length > 0 && (
            <ErrorTable ref={errorTable} errors={preview.errors} />
          )}
          <section className="mb-28 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
              <h2 className="font-semibold">変更の内容</h2>
              <div className="flex gap-1">
                {(["all", "new", "update", "unchanged"] as const).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={filter === value}
                      onClick={() => {
                        setFilter(value);
                        setVisible(50);
                      }}
                      className={cn(
                        "min-h-9 rounded-full px-3 text-sm",
                        filter === value
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--surface-subtle)]",
                      )}
                    >
                      {
                        {
                          all: "すべて",
                          new: "新規",
                          update: "更新",
                          unchanged: "変更なし",
                        }[value]
                      }
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="p-3">行</th>
                    <th className="p-3">区分</th>
                    <th className="p-3">対象</th>
                    <th className="p-3">変更</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, visible).map((change) => (
                    <tr
                      key={`${change.row}-${change.code}`}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="p-3">{change.row}</td>
                      <td className="p-3">
                        {change.kind === "new"
                          ? "新規"
                          : change.kind === "update"
                            ? "更新"
                            : "変更なし"}
                      </td>
                      <td className="p-3">
                        {change.code} {change.name}
                      </td>
                      <td className="p-3">
                        <ChangeSummary change={change} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown.length > visible && (
              <div className="p-3 text-center">
                <Button
                  variant="secondary"
                  onClick={() => setVisible((value) => value + 50)}
                >
                  さらに表示
                </Button>
              </div>
            )}
          </section>
          <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-lg">
            {preview.errors.length > 0 ? (
              <p className="font-semibold text-[var(--destructive)]">
                エラーが {preview.errors.length}件あるため登録できません
              </p>
            ) : (
              <p className="text-sm">内容を確認して登録してください</p>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset}>
                キャンセル
              </Button>
              <Button
                disabled={
                  busy || preview.errors.length > 0 || registerCount === 0
                }
                onClick={() => void commit()}
              >
                {registerCount}件を登録
              </Button>
            </div>
          </div>
        </>
      )}
      {message && (
        <p
          role="alert"
          className="flex items-center gap-2 text-sm font-semibold text-[var(--destructive)]"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          {message}
        </p>
      )}
    </div>
  );
}

function ErrorTable({
  errors,
  ref,
}: {
  errors: Preview["errors"];
  ref: React.Ref<HTMLElement>;
}) {
  return (
    <section
      ref={ref}
      className="scroll-mt-4 overflow-hidden rounded-2xl border border-[var(--destructive)] bg-white"
    >
      <h2 className="p-4 font-semibold text-[var(--destructive)]">
        エラー {errors.length}件
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-red-50">
            <tr>
              <th className="p-3">行</th>
              <th className="p-3">列</th>
              <th className="p-3">内容</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((error, index) => (
              <tr
                key={`${error.row}-${error.column}-${index}`}
                className="border-t border-[var(--border)]"
              >
                <td className="p-3">{error.row}</td>
                <td className="p-3">{error.column}</td>
                <td className="p-3">{error.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChangeSummary({ change }: { change: Change }) {
  if (change.kind === "new") return <>新しく登録</>;
  const lines = formatImportChanges(change.changes);
  if (lines.length === 0) return <>変更なし</>;
  return (
    <ul className="space-y-1">
      {lines.map((line) => (
        <li key={line.label}>
          {line.label}：
          <span className="text-[var(--muted-foreground)] line-through">
            {line.before}
          </span>
          {" → "}
          <strong>{line.after}</strong>
        </li>
      ))}
    </ul>
  );
}
