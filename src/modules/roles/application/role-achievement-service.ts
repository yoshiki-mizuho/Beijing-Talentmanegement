import { cache } from "react";

import {
  getPendingRoleAchievementCelebration,
  listMemberRoleAchievements as fetchMemberRoleAchievements,
  listRoleAchievements,
  markRoleAchievementCelebrated,
  recordRoleAchievements
} from "@/modules/roles/infrastructure/role-achievement-repository";

const listMemberRoleAchievements = cache(fetchMemberRoleAchievements);

export {
  getPendingRoleAchievementCelebration,
  listMemberRoleAchievements,
  listRoleAchievements,
  markRoleAchievementCelebrated,
  recordRoleAchievements
};
