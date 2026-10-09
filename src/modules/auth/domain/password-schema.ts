import { z } from "zod";

export const INITIAL_PASSWORD = "password";
export const PASSWORD_MIN_LENGTH = 8;

export const changePasswordInputSchema = z
  .object({
    userId: z.string().min(1),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(PASSWORD_MIN_LENGTH),
    confirmPassword: z.string().min(PASSWORD_MIN_LENGTH)
  })
  .superRefine((input, context) => {
    if (input.newPassword !== input.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "新しいパスワードと確認入力が一致していません。",
        path: ["confirmPassword"]
      });
    }

    if (input.currentPassword === input.newPassword) {
      context.addIssue({
        code: "custom",
        message: "新しいパスワードは現在のパスワードと異なるものを入力してください。",
        path: ["newPassword"]
      });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
