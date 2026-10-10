import { badgePalette, type BadgeDefinition } from "@/modules/growth/domain/badge-art";
import { Tooltip } from "@/shared/ui/tooltip";

export function EarnedBadge({
  badge
}: {
  badge: BadgeDefinition & { frameColor: string; backgroundColor: string };
}) {
  return (
    <Tooltip content={badge.name}>
      <span
        tabIndex={0}
        aria-label={badge.name}
        className="grid h-12 w-12 place-items-center rounded-lg border-2"
        style={{ borderColor: badge.frameColor, backgroundColor: badge.backgroundColor }}
      >
        <span className="grid h-8 w-8 grid-cols-12 grid-rows-12 overflow-hidden" aria-hidden="true">
          {badge.art.flatMap((row, y) =>
            Array.from(row).map((pixel, x) => (
              <span
                key={`${y}-${x}`}
                style={{ backgroundColor: pixel === "." ? "transparent" : badgePalette[pixel] }}
              />
            ))
          )}
        </span>
      </span>
    </Tooltip>
  );
}
