import { Eye, EyeOff } from "lucide-react";
import { setProfileVisibilityAction } from "./actions";
import { ActionForm } from "@/shared/ui/action-form";

export function ProfileVisibility({ isPublic }: { isPublic: boolean }) {
  const Icon = isPublic ? Eye : EyeOff;
  const label = isPublic ? "公開中" : "非公開";
  return (
    <ActionForm action={setProfileVisibilityAction}>
      <input type="hidden" name="isPublic" value={String(!isPublic)} />
      <button
        type="submit"
        role="switch"
        aria-label="プロフィールを公開"
        aria-checked={isPublic}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] px-3 hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span>{label}</span>
      </button>
    </ActionForm>
  );
}
