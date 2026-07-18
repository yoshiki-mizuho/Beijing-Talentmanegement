import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

import { getCurrentSession } from "@/server/auth/session";
import { AppShell } from "@/shared/ui/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const requestPath = (await headers()).get("x-pathname") ?? "";

  if (session.user.passwordChangeRequired && requestPath !== "/account/password") {
    redirect("/account/password" as Route);
  }

  return (
    <AppShell
      user={{
        name: session.user.name,
        role: session.user.role
      }}
    >
      {children}
    </AppShell>
  );
}