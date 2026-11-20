"use client";

import type { ReactNode } from "react";

import { downloadApiFile } from "@/shared/lib/api-client";

type ApiDownloadButtonProps = {
  url: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

// サーバーで描く画面から、API のファイルを共通の apiClient を通してダウンロードするボタン
export function ApiDownloadButton({ url, ariaLabel, className, children }: ApiDownloadButtonProps) {
  return (
    <button
      type="button"
      onClick={() => void downloadApiFile(url)}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}
