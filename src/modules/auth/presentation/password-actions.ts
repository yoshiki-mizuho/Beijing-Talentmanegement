"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { changePassword } from "@/modules/auth/application/password-service";
import { requireAuthenticatedMember } from "@/server/auth/authorization";
import { getString } from "@/shared/lib/form-data";

export type ChangePasswordFormState = {
  error: string | null;
};

export async function changePasswordAction(
  _previousState: ChangePasswordFormState,
  formData: FormData
): Promise<ChangePasswordFormState> {
  const session = await requireAuthenticatedMember();

  try {
    await changePassword({
      userId: session.user.id,
      currentPassword: getString(formData, "currentPassword"),
      newPassword: getString(formData, "newPassword"),
      confirmPassword: getString(formData, "confirmPassword")
    });
  } catch {
    return {
      error:
        "入力内容を確認してください。現在のパスワード、新しいパスワード、確認入力が条件を満たす必要があります。"
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
