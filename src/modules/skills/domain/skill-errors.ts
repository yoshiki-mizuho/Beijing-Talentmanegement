import { UserFacingError } from "@/shared/lib/user-facing-error";

export class SkillNameConflictError extends UserFacingError {
  constructor() {
    super("同じカテゴリに同名のスキルがすでに登録されています。");
    this.name = "SkillNameConflictError";
  }
}

export class SkillCategoryNotFoundError extends UserFacingError {
  constructor() {
    super("選択したスキルカテゴリが見つかりません。");
    this.name = "SkillCategoryNotFoundError";
  }
}

export class SkillCodeGenerationError extends UserFacingError {
  constructor() {
    super("一意なスキルコードを発行できませんでした。もう一度お試しください。");
    this.name = "SkillCodeGenerationError";
  }
}
