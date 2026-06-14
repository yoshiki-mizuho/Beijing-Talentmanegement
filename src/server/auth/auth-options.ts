import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";

import { credentialsProvider } from "@/modules/auth/application/credentials-auth";
import {
  applyAuthTokenToSession,
  revalidateAuthToken
} from "@/modules/auth/application/session-revalidation";
import { prisma } from "@/server/db/prisma";

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
  providers: [credentialsProvider],
  callbacks: {
    async jwt({ token, user }) {
      return revalidateAuthToken(token, user);
    },
    session({ session, token }) {
      return applyAuthTokenToSession(session, token);
    }
  }
};
