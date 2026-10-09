"use client";

import type { CSSProperties } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      theme="light"
      richColors={false}
      containerAriaLabel="操作結果の通知"
      toastOptions={{
        closeButtonAriaLabel: "通知を閉じる",
        classNames: {
          toast: "border border-[var(--border)] text-[var(--foreground)] shadow-lg",
          success: "border-l-4 border-l-[var(--accent-green)]",
          error: "border-l-4 border-l-[var(--destructive)]",
          closeButton:
            "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)]"
        }
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)"
        } as CSSProperties
      }
    />
  );
}
