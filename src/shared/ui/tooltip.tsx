import type { ReactNode } from "react";

const positions = {
  bottom: "left-1/2 top-[calc(100%+8px)] -translate-x-1/2",
  right: "left-[calc(100%+8px)] top-1/2 -translate-y-1/2"
} as const;

export function Tooltip({
  content,
  children,
  side = "bottom"
}: {
  content: string;
  children: ReactNode;
  side?: keyof typeof positions;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block group-focus-within:block ${positions[side]}`}
      >
        {content}
      </span>
    </span>
  );
}
