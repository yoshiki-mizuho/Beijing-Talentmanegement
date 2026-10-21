import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export function createChangePasswordInputSchema(
  currentPasswordRequired: boolean,
) {
  return z
    .object({
      userId: z.string().min(1),
      currentPassword: currentPasswordRequired
        ? z.string().min(1)
        : z.string().optional(),
      newPassword: z.string().min(PASSWORD_MIN_LENGTH),
      confirmPassword: z.string().min(PASSWORD_MIN_LENGTH),
    })
    .superRefine((input, context) => {
      if (input.newPassword !== input.confirmPassword) {
        context.addIssue({
          code: "custom",
          message: "新しいパスワードと確認入力が一致していません。",
          path: ["confirmPassword"],
        });
      }

      if (
        input.currentPassword &&
        input.currentPassword === input.newPassword
      ) {
        context.addIssue({
          code: "custom",
          message:
            "新しいパスワードは現在のパスワードと異なるものを入力してください。",
          path: ["newPassword"],
        });
      }
    });
}

export type ChangePasswordInput = z.infer<
  ReturnType<typeof createChangePasswordInputSchema>
>;
