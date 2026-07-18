export class SkillNameConflictError extends Error {
  constructor() {
    super("A skill with the same name already exists in this category.");
    this.name = "SkillNameConflictError";
  }
}

export class SkillCategoryNotFoundError extends Error {
  constructor() {
    super("The selected skill category does not exist.");
    this.name = "SkillCategoryNotFoundError";
  }
}

export class SkillCodeGenerationError extends Error {
  constructor() {
    super("Could not allocate a unique skill code.");
    this.name = "SkillCodeGenerationError";
  }
}