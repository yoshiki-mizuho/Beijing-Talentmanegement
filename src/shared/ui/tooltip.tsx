"use client";

import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";

const TOOLTIP_GAP = 8;
const VIEWPORT_MARGIN = 8;

type TooltipSide = "bottom" | "right";

type Rect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export function calculateTooltipPosition({
  anchorRect,
  tooltipSize,
  viewportSize,
  side
}: {
  anchorRect: Rect;
  tooltipSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  side: TooltipSide;
}) {
  const maxX = Math.max(VIEWPORT_MARGIN, viewportSize.width - tooltipSize.width - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, viewportSize.height - tooltipSize.height - VIEWPORT_MARGIN);
  let x: number;
  let y: number;

  if (side === "right") {
    x = anchorRect.right + TOOLTIP_GAP;
    if (x + tooltipSize.width > viewportSize.width - VIEWPORT_MARGIN) {
      x = anchorRect.left - tooltipSize.width - TOOLTIP_GAP;
    }
    y = anchorRect.top + (anchorRect.height - tooltipSize.height) / 2;
  } else {
    x = anchorRect.left + (anchorRect.width - tooltipSize.width) / 2;
    y = anchorRect.bottom + TOOLTIP_GAP;
    if (y + tooltipSize.height > viewportSize.height - VIEWPORT_MARGIN) {
      y = anchorRect.top - tooltipSize.height - TOOLTIP_GAP;
    }
  }

  return {
    left: Math.min(Math.max(x, VIEWPORT_MARGIN), maxX),
    top: Math.min(Math.max(y, VIEWPORT_MARGIN), maxY)
  };
}

export function Tooltip({
  content,
  children,
  side = "bottom"
}: {
  content: string;
  children: ReactNode;
  side?: TooltipSide;
}) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;

    setPosition(calculateTooltipPosition({
      anchorRect: anchor.getBoundingClientRect(),
      tooltipSize: { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
      viewportSize: { width: window.innerWidth, height: window.innerHeight },
      side
    }));
  }, [side]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, content, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updatePosition]);

  const childElement = isValidElement(children)
    ? children as ReactElement<{ "aria-describedby"?: string }>
    : null;
  const describedChild = childElement
    ? cloneElement(childElement, {
        "aria-describedby": [childElement.props["aria-describedby"], open ? id : undefined]
          .filter(Boolean)
          .join(" ")
      })
    : children;

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).matches(":focus-visible")) setOpen(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onClickCapture={() => setOpen(false)}
    >
      {describedChild}
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              id={id}
              role="tooltip"
              style={position}
              className="pointer-events-none fixed z-[100] whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-1 text-xs font-medium text-white shadow-lg"
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}
