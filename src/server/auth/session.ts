import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth/auth-options";

export function getCurrentSession() {
  return getServerSession(authOptions);
}
