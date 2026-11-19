"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/shared/ui/button";

export function SignOutButton({ className }: { className?: string }) {
  async function signOut() {
    const csrfToken = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("csrf_token="))
      ?.slice("csrf_token=".length);
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: csrfToken ? { "X-CSRF-Token": decodeURIComponent(csrfToken) } : {}
      });
    } finally {
      window.location.assign(new URL("/login", window.location.origin));
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="small"
      className={className ?? "px-2 sm:px-3"}
      onClick={() => void signOut()}
      aria-label="ログアウト"
      title="ログアウト"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">ログアウト</span>
    </Button>
  );
}
