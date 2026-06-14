"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/shared/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      ログアウト
    </Button>
  );
}
