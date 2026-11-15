"use server";

import { revalidatePath } from "next/cache";
import { requireRoles, adminOnly } from "@/server/auth/authorization";
import { runAction, runActionWithData } from "@/shared/lib/action-result";
import {
  inspectTemplateUpload,
  registerTemplate,
  removeTemplate,
  renameTemplate,
  replaceTemplate
} from "../application/skill-sheet-template-service";

async function context() {
  const session = await requireRoles(adminOnly);
  return { memberId: session.user.memberId, role: session.user.role };
}

export async function inspectTemplateAction(file: File) {
  return runActionWithData(async () => inspectTemplateUpload(await context(), file), "点検しました。");
}

export async function registerTemplateAction(name: string, file: File) {
  return runAction(async () => {
    await registerTemplate(await context(), name, file);
    revalidatePath("/skill-sheet-templates");
  }, "ひな形を登録しました。");
}

export async function renameTemplateAction(id: string, name: string) {
  return runAction(async () => {
    await renameTemplate(await context(), id, name);
    revalidatePath("/skill-sheet-templates");
  }, "名前を変更しました。");
}

export async function replaceTemplateAction(id: string, file: File) {
  return runAction(async () => {
    await replaceTemplate(await context(), id, file);
    revalidatePath("/skill-sheet-templates");
  }, "ひな形を差し替えました。");
}

export async function deleteTemplateAction(id: string) {
  return runAction(async () => {
    await removeTemplate(await context(), id);
    revalidatePath("/skill-sheet-templates");
  }, "ひな形を削除しました。");
}
