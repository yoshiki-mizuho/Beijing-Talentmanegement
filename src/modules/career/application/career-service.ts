import type { AuthRole } from "@prisma/client";

import { getMemberScope, memberIsInScope } from "@/modules/members/application/member-scope";
import { AuthorizationError } from "@/server/auth/authorization";
import { UserFacingError } from "@/shared/lib/user-facing-error";
import { canAccessMemberCareer } from "../domain/career-access";
import {
  certificationSchema,
  projectHistorySchema,
  skillSheetBasicsSchema,
  type CertificationInput,
  type ProjectHistoryInput,
  type SkillSheetBasicsInput
} from "../domain/career-schema";
import * as repository from "../infrastructure/career-repository";

export type CareerActor = { memberId: string; role: AuthRole };

export async function canActorAccessCareer(actor: CareerActor, targetMemberId: string) {
  if (actor.role === "ADMIN" || actor.memberId === targetMemberId) return true;
  if (actor.role !== "MANAGER") return false;
  const scope = await getMemberScope(actor.role, actor.memberId);
  return canAccessMemberCareer({
    role: actor.role,
    viewerMemberId: actor.memberId,
    targetMemberId,
    targetIsInScope: memberIsInScope(scope, targetMemberId)
  });
}

export async function getCareerForActor(actor: CareerActor, targetMemberId: string) {
  if (!(await canActorAccessCareer(actor, targetMemberId))) return null;
  return repository.getMemberCareer(targetMemberId);
}

async function authorize(actor: CareerActor, targetMemberId: string) {
  if (!(await canActorAccessCareer(actor, targetMemberId))) {
    throw new AuthorizationError("Forbidden.", 403);
  }
}

export async function upsertProjectHistory(actor: CareerActor, memberId: string, input: ProjectHistoryInput) {
  await authorize(actor, memberId);
  const parsed = projectHistorySchema.parse(input);
  if (!parsed.id && await repository.countProjectHistories(memberId) >= 100) {
    throw new UserFacingError("経歴は100件までです。");
  }
  if (parsed.id && !(await repository.findProjectHistory(parsed.id, memberId))) {
    throw new AuthorizationError("Forbidden.", 403);
  }
  return repository.saveProjectHistory(memberId, actor.memberId, parsed);
}

export async function removeProjectHistory(actor: CareerActor, memberId: string, id: string) {
  await authorize(actor, memberId);
  const history = await repository.findProjectHistory(id, memberId);
  if (!history) throw new AuthorizationError("Forbidden.", 403);
  await repository.deleteProjectHistory(history, actor.memberId);
}

export async function addCertification(actor: CareerActor, memberId: string, input: CertificationInput) {
  await authorize(actor, memberId);
  const parsed = certificationSchema.parse(input);
  if (await repository.countCertifications(memberId) >= 50) {
    throw new UserFacingError("資格は50件までです。");
  }
  const key = parsed.name.trim().toLocaleLowerCase();
  const duplicate = (await repository.findCertifications(memberId))
    .some((item) => item.name.trim().toLocaleLowerCase() === key);
  if (duplicate) throw new UserFacingError("同じ資格がすでに登録されています。");
  return repository.createCertification(memberId, actor.memberId, parsed);
}

export async function removeCertification(actor: CareerActor, memberId: string, id: string) {
  await authorize(actor, memberId);
  const certification = await repository.findCertification(id, memberId);
  if (!certification) throw new AuthorizationError("Forbidden.", 403);
  await repository.deleteCertification(certification, actor.memberId);
}

export async function saveSkillSheetBasics(actor: CareerActor, memberId: string, input: SkillSheetBasicsInput) {
  await authorize(actor, memberId);
  const parsed = skillSheetBasicsSchema.parse(input);
  await repository.updateSkillSheetBasics(memberId, actor.memberId, parsed);
}
