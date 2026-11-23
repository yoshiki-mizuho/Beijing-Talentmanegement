export type SkillLevel = 1 | 2 | 3 | 4 | 5;

const skillLevelStyles = {
  1: { backgroundColor: "var(--hub-color-primary-50)", color: "var(--hub-color-primary-800)" },
  2: { backgroundColor: "var(--hub-color-primary-100)", color: "var(--hub-color-primary-800)" },
  3: { backgroundColor: "var(--hub-color-primary-200)", color: "var(--hub-color-primary-900)" },
  4: { backgroundColor: "var(--hub-color-primary-600)", color: "var(--hub-color-text-on-primary)" },
  5: { backgroundColor: "var(--hub-color-primary-800)", color: "var(--hub-color-text-on-primary)" }
} as const satisfies Record<SkillLevel, {
  backgroundColor: string;
  color: string;
}>;

export function getSkillLevelStyle(level: number) {
  return skillLevelStyles[level as SkillLevel] ?? null;
}

export function getContrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string) {
  const [red, green, blue] = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((component) => Number.parseInt(component, 16) / 255)
    .map((component) =>
      component <= 0.04045
        ? component / 12.92
        : ((component + 0.055) / 1.055) ** 2.4
    );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
