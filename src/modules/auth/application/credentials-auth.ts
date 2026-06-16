import bcrypt from "bcryptjs";
import type { AuthRole } from "@prisma/client";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import {
  buildLoginRateLimitKey,
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginFailures
} from "@/modules/auth/application/login-rate-limit";
import { getClientIp } from "@/modules/auth/application/request-context";
import { prisma } from "@/server/db/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const DUMMY_PASSWORD_HASH =
  "$2b$12$W0aJjHvsNgkmUrpsErdVN.Wy6f8tgMGGWFafG4TOxVgzfeavV4/DS";

type LoginUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  passwordChangeRequired: boolean;
  role: AuthRole;
  memberId: string | null;
  member: { status: string } | null;
};

type ActiveLoginUser = LoginUser & {
  passwordHash: string;
  memberId: string;
  member: { status: "ACTIVE" };
};

function isLoginAllowedUser(
  user: LoginUser | null,
  isValidPassword: boolean
): user is ActiveLoginUser {
  return Boolean(
    user?.passwordHash &&
      isValidPassword &&
      user.memberId &&
      user.member?.status === "ACTIVE"
  );
}

export const credentialsProvider = CredentialsProvider({
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(rawCredentials, request) {
    const parsedCredentials = credentialsSchema.safeParse(rawCredentials);

    if (!parsedCredentials.success) {
      return null;
    }

    const email = parsedCredentials.data.email.trim().toLowerCase();
    const rateLimitKey = buildLoginRateLimitKey(
      getClientIp(request?.headers),
      email
    );
    const rateLimit = checkLoginRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        passwordChangeRequired: true,
        role: true,
        memberId: true,
        member: {
          select: {
            status: true
          }
        }
      }
    });

    const isValidPassword = await bcrypt.compare(
      parsedCredentials.data.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH
    );

    if (!isLoginAllowedUser(user, isValidPassword)) {
      recordLoginFailure(rateLimitKey);
      return null;
    }

    resetLoginFailures(rateLimitKey);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      memberId: user.memberId,
      passwordChangeRequired: user.passwordChangeRequired
    };
  }
});
