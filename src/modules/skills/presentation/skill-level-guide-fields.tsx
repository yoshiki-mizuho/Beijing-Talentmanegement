import { TextareaField } from "@/shared/ui/form-field";

export function SkillLevelGuideFields({
  idPrefix,
  levels,
  guides = [],
}: {
  idPrefix: string;
  levels: Array<{ level: number; description: string }>;
  guides?: Array<{ level: number; description: string }>;
}) {
  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-4">
      <div>
        <h3 className="font-semibold text-[var(--foreground)]">レベルの目安</h3>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          空欄のレベルは共通の目安を表示します。
        </p>
      </div>
      {levels.map((level) => (
        <TextareaField
          key={level.level}
          id={`${idPrefix}-${level.level}`}
          label={`Lv${level.level}`}
          name={`levelGuide${level.level}`}
          rows={2}
          maxLength={300}
          className="[&_textarea]:min-h-16"
          defaultValue={
            guides.find((guide) => guide.level === level.level)?.description ??
            ""
          }
          placeholder={`空欄の場合: ${level.description}`}
        />
      ))}
    </div>
  );
}
