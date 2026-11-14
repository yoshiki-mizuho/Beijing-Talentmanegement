"use server";

import { revalidatePath } from "next/cache";

import {
  addCertification,
  removeCertification,
  removeProjectHistory,
  saveSkillSheetBasics,
  upsertProjectHistory
} from "../application/career-service";
import { requirePasswordReadyMember } from "@/server/auth/authorization";
import { runAction, type ActionResult } from "@/shared/lib/action-result";

function actor(session: Awaited<ReturnType<typeof requirePasswordReadyMember>>) {
  return { memberId: session.user.memberId, role: session.user.role };
}

export async function saveProjectHistoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const memberId = String(formData.get("memberId"));
    await upsertProjectHistory(actor(session), memberId, {
      id: optional(formData.get("id")),
      title: String(formData.get("title") ?? ""),
      startMonth: String(formData.get("startMonth") ?? ""),
      endMonth: optional(formData.get("endMonth")),
      industry: String(formData.get("industry") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      role: String(formData.get("role") ?? ""),
      teamSize: String(formData.get("teamSize") ?? ""),
      businessArea: optional(formData.get("businessArea")),
      phases: formData.getAll("phases").map(String),
      technologies: String(formData.get("technologies") ?? "")
    });
    revalidatePath(`/people/${memberId}`);
  }, formData.get("id") ? "経歴を更新しました。" : "経歴を追加しました。");
}

export async function deleteProjectHistoryAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const memberId = String(formData.get("memberId"));
    await removeProjectHistory(actor(session), memberId, String(formData.get("id")));
    revalidatePath(`/people/${memberId}`);
  }, "経歴を削除しました。");
}

export async function addCertificationAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const memberId = String(formData.get("memberId"));
    await addCertification(actor(session), memberId, {
      name: String(formData.get("name") ?? ""),
      acquiredMonth: optional(formData.get("acquiredMonth"))
    });
    revalidatePath(`/people/${memberId}`);
  }, "資格を追加しました。");
}

export async function deleteCertificationAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const memberId = String(formData.get("memberId"));
    await removeCertification(actor(session), memberId, String(formData.get("id")));
    revalidatePath(`/people/${memberId}`);
  }, "資格を削除しました。");
}

export async function saveSkillSheetBasicsAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requirePasswordReadyMember();
    const memberId = String(formData.get("memberId"));
    await saveSkillSheetBasics(actor(session), memberId, {
      itCareerStartMonth: optional(formData.get("itCareerStartMonth")),
      skillSheetNote: optional(formData.get("skillSheetNote"))
    });
    revalidatePath(`/people/${memberId}`);
  }, "シートの基本情報を保存しました。");
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}
