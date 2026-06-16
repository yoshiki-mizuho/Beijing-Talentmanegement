import bcrypt from "bcryptjs";

import type { ChangePasswordInput } from "@/modules/auth/domain/password-schema";
import { prisma } from "@/server/db/prisma";

export async function changePassword(input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      passwordHash: true
    }
  });

  if (!user?.passwordHash) {
    throw new Error("Current password is not set.");
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash
  );

  if (!isCurrentPasswordValid) {
    throw new Error("Current password is invalid.");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);

  return prisma.user.update({
    where: { id: input.userId },
    data: {
      passwordHash,
      passwordChangeRequired: false
    }
  });
}
