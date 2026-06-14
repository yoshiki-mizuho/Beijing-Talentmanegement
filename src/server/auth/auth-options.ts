import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { AuthRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import {
  buildLoginRateLimitKey,
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginFailures
} from "@/modules/auth/application/login-rate-limit";
import { prisma } from "@/server/db/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const AUTH_RECHECK_INTERVAL_SECONDS = 0;
const DUMMY_PASSWORD_HASH =
  "$2b$12$W0aJjHvsNgkmUrpsErdVN.Wy6f8tgMGGWFafG4TOxVgzfeavV4/DS";

function getHeaderValue(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] ?? record[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getClientIp(headers: unknown) {
  const forwardedFor = getHeaderValue(headers, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return getHeaderValue(headers, "x-real-ip") ?? "unknown";
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
    updateAge: 5 * 60
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
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

        if (
          !user ||
          !user.passwordHash ||
          !isValidPassword ||
          !user.memberId ||
          user.member?.status !== "ACTIVE"
        ) {
          recordLoginFailure(rateLimitKey);
          return null;
        }

        resetLoginFailures(rateLimitKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          memberId: user.memberId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
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
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? AuthRole.MEMBER;
        session.user.memberId = token.memberId;
        session.user.isActive = token.isActive === true;
      }

      return session;
    }
  }
};
