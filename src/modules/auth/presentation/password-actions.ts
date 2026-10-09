"use server";

import { revalidatePath } from "next/cache";

import { changePassword } from "@/modules/auth/application/password-service";
import { requireAuthenticatedMember } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";
import { getString } from "@/shared/lib/form-data";

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireAuthenticatedMember();
    await changePassword({
      userId: session.user.id,
      currentPassword: getString(formData, "currentPassword"),
      newPassword: getString(formData, "newPassword"),
      confirmPassword: getString(formData, "confirmPassword")
    });
    revalidatePath("/", "layout");
  }, "パスワードを変更しました。");
}
