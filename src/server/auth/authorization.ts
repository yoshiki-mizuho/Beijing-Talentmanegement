import { AuthRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/server/auth/session";

type CurrentSession = NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>;
type MemberSession = CurrentSession & {
  user: CurrentSession["user"] & {
    memberId: string;
  };
};

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403
  ) {
    super(message);
  }
}

export async function requireAuthenticatedMember() {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    throw new AuthorizationError("A member-linked session is required.", 401);
  }

  return session as MemberSession;
}

export async function requirePasswordReadyMember() {
  const session = await requireAuthenticatedMember();

  if (session.user.passwordChangeRequired) {
    throw new AuthorizationError("Password change is required.", 403);
  }

  return session;
}

export async function requireRoles(allowedRoles: readonly AuthRole[]) {
  const session = await requirePasswordReadyMember();

  if (!allowedRoles.includes(session.user.role)) {
    throw new AuthorizationError("Forbidden.", 403);
  }

  return session;
}

export async function requirePageRoles(allowedRoles: readonly AuthRole[]) {
  const session = await getCurrentSession();

  if (!session?.user.memberId) {
    redirect("/login");
  }

  if (session.user.passwordChangeRequired) {
    redirect("/account/password");
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect("/dashboard");
  }

  return session as MemberSession;
}

export async function authorizeApi(allowedRoles?: readonly AuthRole[]) {
  try {
    const session = allowedRoles
      ? await requireRoles(allowedRoles)
      : await requirePasswordReadyMember();

    return { session };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        response: NextResponse.json(
          { error: error.status === 401 ? "Unauthorized" : "Forbidden" },
          { status: error.status }
        )
      };
    }

    throw error;
  }
}

export async function authorizePasswordChangeApi() {
  try {
    return { session: await requireAuthenticatedMember() };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      };
    }

    throw error;
  }
}

export const adminOnly = [AuthRole.ADMIN] as const;
export const managerOrAdmin = [AuthRole.ADMIN, AuthRole.MANAGER] as const;
