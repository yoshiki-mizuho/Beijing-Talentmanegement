import bcrypt from "bcryptjs";

import type { ChangePasswordInput } from "@/modules/auth/domain/password-schema";
import { prisma } from "@/server/db/prisma";
import { UserFacingError } from "@/shared/lib/user-facing-error";

export async function changePassword(input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      passwordHash: true
    }
  });

  if (!user?.passwordHash) {
    throw new UserFacingError(
      "現在のパスワードが設定されていません。管理者にお問い合わせください。"
    );
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword,
    user.passwordHash
  );

  if (!isCurrentPasswordValid) {
    throw new UserFacingError("現在のパスワードが正しくありません。");
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
