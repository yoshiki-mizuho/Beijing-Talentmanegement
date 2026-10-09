"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/shared/ui/button";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="small"
      className={className ?? "px-2 sm:px-3"}
      onClick={() => signOut({ callbackUrl: "/login" })}
      aria-label="ログアウト"
      title="ログアウト"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">ログアウト</span>
    </Button>
  );
}
