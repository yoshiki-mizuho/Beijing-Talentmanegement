"use server";

import { revalidatePath } from "next/cache";
import { setProfileVisibility } from "@/modules/explore/application/explore-service";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runAction } from "@/shared/lib/action-result";

export async function setProfileVisibilityAction(formData: FormData) {
  return runAction(
    async () => {
      const session = await requirePasswordReadyMember();
      const isPublic = formData.get("isPublic") === "true";
      await setProfileVisibility(session.user.memberId, isPublic);
      revalidatePath(`/people/${session.user.memberId}`);
      revalidatePath("/explore");
      return isPublic;
    },
    (isPublic) => (isPublic ? "プロフィールを公開しました。" : "プロフィールを非公開にしました。")
  );
}
