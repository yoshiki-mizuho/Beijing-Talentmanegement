import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth/auth-options";

export async function getCurrentSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isActive) {
    return null;
  }

  return session;
}
