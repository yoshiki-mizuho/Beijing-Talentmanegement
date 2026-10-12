"use server";

import { revalidatePath } from "next/cache";
import { setProfileVisibility } from "@/modules/explore/application/explore-service";
import {
  deleteMyAvatar,
  updateMyAvatar
} from "@/modules/members/application/member-avatar-service";
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

export async function updateMyAvatarAction(formData: FormData) {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const avatar = formData.get("avatar");
    if (!(avatar instanceof File)) throw new Error("Avatar file is required.");
    await updateMyAvatar(session.user.memberId, avatar);
    revalidatePath("/", "layout");
  }, "アイコン画像を変更しました。");
}

export async function deleteMyAvatarAction() {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    await deleteMyAvatar(session.user.memberId);
    revalidatePath("/", "layout");
  }, "アイコン画像を削除しました。");
}
