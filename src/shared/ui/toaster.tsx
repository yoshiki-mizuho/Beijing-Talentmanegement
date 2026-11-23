"use client";

import type { CSSProperties } from "react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      offset="var(--hub-space-6)"
      closeButton
      theme="light"
      richColors={false}
      containerAriaLabel="操作結果の通知"
      toastOptions={{
        closeButtonAriaLabel: "通知を閉じる",
        classNames: {
          toast: "max-w-[min(360px,calc(100vw-3rem))] rounded-[var(--hub-radius-lg)] border-0 px-[var(--hub-space-4)] py-[var(--hub-space-2)] text-[length:var(--hub-text-sm)] text-[var(--hub-color-text-on-primary)] shadow-[var(--hub-shadow-lg)]",
          success: "bg-[var(--hub-color-success-text)]",
          error: "bg-[var(--hub-color-danger-text)]",
          closeButton:
            "border-[var(--hub-color-border-strong)] bg-[var(--hub-color-surface)] text-[var(--hub-color-text)]"
        }
      }}
      style={
        {
          "--normal-bg": "var(--hub-color-toast-bg)",
          "--normal-text": "var(--hub-color-text-on-primary)",
          "--normal-border": "transparent",
          zIndex: "var(--hub-z-toast)"
        } as CSSProperties
      }
    />
  );
}
