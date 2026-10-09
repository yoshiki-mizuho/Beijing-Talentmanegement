import {
  cheerInputSchema,
  levelUpCommentInputSchema,
  levelUpReactionInputSchema,
  oneOnOneNoteInputSchema,
  oneOnOneNoteUpdateInputSchema
} from "@/modules/growth/domain/growth-schema";
import * as growthRepository from "@/modules/growth/infrastructure/growth-repository";

export function addLevelUpReaction(input: unknown) {
  return growthRepository.addLevelUpReaction(
    levelUpReactionInputSchema.parse(input)
  );
}

export function removeLevelUpReaction(input: unknown) {
  return growthRepository.removeLevelUpReaction(
    levelUpReactionInputSchema.parse(input)
  );
}

export function createLevelUpComment(input: unknown) {
  return growthRepository.createLevelUpComment(
    levelUpCommentInputSchema.parse(input)
  );
}

export function createCheer(input: unknown) {
  return growthRepository.createCheer(cheerInputSchema.parse(input));
}

export function createOneOnOneNote(input: unknown) {
  return growthRepository.createOneOnOneNote(
    oneOnOneNoteInputSchema.parse(input)
  );
}

export function updateOneOnOneNote(input: unknown) {
  return growthRepository.updateOneOnOneNote(
    oneOnOneNoteUpdateInputSchema.parse(input)
  );
}

export function listOneOnOneNotes(
  managerMemberId: string,
  memberId?: string
) {
  return growthRepository.listOneOnOneNotes(managerMemberId, memberId);
}

export function toggleOneOnOneNoteDiscussed(
  id: string,
  managerMemberId: string
) {
  return growthRepository.toggleOneOnOneNoteDiscussed(id, managerMemberId);
}
