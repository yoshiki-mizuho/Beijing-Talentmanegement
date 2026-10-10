import { Eye, EyeOff } from "lucide-react";
import { setProfileVisibilityAction } from "./actions";
import { Tooltip } from "@/shared/ui/tooltip";
import { ActionForm } from "@/shared/ui/action-form";

export function ProfileVisibility({ isPublic }: { isPublic: boolean }) {
  const Icon = isPublic ? Eye : EyeOff;
  const tooltip = isPublic ? "公開中" : "非公開";
  return (
    <ActionForm action={setProfileVisibilityAction}>
      <input type="hidden" name="isPublic" value={String(!isPublic)} />
      <Tooltip content={tooltip} side="right">
        <button
          type="submit"
          role="switch"
          aria-label="プロフィールを公開"
          aria-checked={isPublic}
          className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] hover:bg-[var(--surface-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      </Tooltip>
    </ActionForm>
  );
}
