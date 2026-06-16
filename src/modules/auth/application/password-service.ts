import { changePasswordInputSchema } from "@/modules/auth/domain/password-schema";
import * as passwordRepository from "@/modules/auth/infrastructure/password-repository";

export function changePassword(input: unknown) {
  return passwordRepository.changePassword(changePasswordInputSchema.parse(input));
}
