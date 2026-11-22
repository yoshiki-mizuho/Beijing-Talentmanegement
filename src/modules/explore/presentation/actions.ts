"use server";

import { revalidatePath } from "next/cache";
import {
  setProfileVisibility,
  updateMyProfile
} from "@/modules/explore/application/explore-service";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runAction } from "@/shared/lib/action-result";

export async function setProfileVisibilityAction(formData: FormData) {
  return runAction(
    async () => {
      const session = await requirePasswordReadyMember();
      const isPublic = formData.get("isPublic") === "true";
      await setProfileVisibility(session.user.memberId, isPublic);
      revalidatePath(`/talent/people/${session.user.memberId}`);
      revalidatePath("/talent/explore");
      return isPublic;
    },
    (isPublic) => (isPublic ? "プロフィールを公開しました。" : "プロフィールを非公開にしました。")
  );
}

export async function updateMyProfileAction(formData: FormData) {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await updateMyProfile(session.user.memberId, {
      profileMessage: String(formData.get("profileMessage") ?? ""),
      consultTopics: formData.getAll("consultTopics").map(String)
    });
    revalidatePath(`/talent/people/${session.user.memberId}`);
  }, "プロフィールを更新しました");
}
