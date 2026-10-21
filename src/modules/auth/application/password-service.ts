import { createChangePasswordInputSchema } from "@/modules/auth/domain/password-schema";
import * as passwordRepository from "@/modules/auth/infrastructure/password-repository";

export async function changePassword(input: unknown) {
  const userId =
    typeof input === "object" && input !== null && "userId" in input
      ? String(input.userId)
      : "";
  const passwordChangeRequired =
    await passwordRepository.isPasswordChangeRequired(userId);
  return passwordRepository.changePassword(
    createChangePasswordInputSchema(!passwordChangeRequired).parse(input),
    passwordChangeRequired,
  );
}
