"use client";

import { LogOut } from "lucide-react";

import { apiClient } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";

export function SignOutButton({ className }: { className?: string }) {
  async function signOut() {
    try {
      await apiClient("/api/v1/auth/logout", { method: "POST" });
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
