import { AuthRole } from "@prisma/client";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { prisma } from "@/server/db/prisma";

const AUTH_RECHECK_INTERVAL_SECONDS = 0;

export async function revalidateAuthToken(token: JWT, user?: User) {
  if (user) {
    token.role = user.role;
    token.memberId = user.memberId;
    token.isActive = true;
    token.authCheckedAt = Math.floor(Date.now() / 1000);
    return token;
  }

  const now = Math.floor(Date.now() / 1000);

  if (
    !token.sub ||
    (typeof token.authCheckedAt === "number" &&
      now - token.authCheckedAt < AUTH_RECHECK_INTERVAL_SECONDS)
  ) {
    return token;
  }

  const freshUser = await prisma.user.findUnique({
    where: { id: token.sub },
    select: {
      role: true,
      memberId: true,
      member: {
        select: {
          status: true
        }
      }
    }
  });

  token.authCheckedAt = now;

  if (
    !freshUser ||
    !freshUser.memberId ||
    freshUser.member?.status !== "ACTIVE"
  ) {
    token.isActive = false;
    token.role = undefined;
    token.memberId = null;
    return token;
  }

  token.isActive = true;
  token.role = freshUser.role;
  token.memberId = freshUser.memberId;

  return token;
}

export function applyAuthTokenToSession(session: Session, token: JWT) {
  if (session.user) {
    session.user.id = token.sub ?? "";
    session.user.role = token.role ?? AuthRole.MEMBER;
    session.user.memberId = token.memberId;
    session.user.isActive = token.isActive === true;
  }

  return session;
}
