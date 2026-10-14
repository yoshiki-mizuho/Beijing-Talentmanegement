"use client";

import { useEffect, useRef } from "react";

// <details> のポップオーバーを、Esc・外側クリック・リンク選択で閉じる。
// 外側クリックで閉じるので、別のポップオーバーを開くと前のものは閉じる。
export function useDismissibleDetails() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function close(returnFocus: boolean) {
      const details = detailsRef.current;
      if (!details?.open) return;
      details.open = false;
      if (returnFocus) details.querySelector("summary")?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (!detailsRef.current?.contains(event.target as Node)) close(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }

    function handleClick(event: MouseEvent) {
      if ((event.target as Element | null)?.closest("a")) close(false);
    }

    const details = detailsRef.current;
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    details?.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      details?.removeEventListener("click", handleClick);
    };
  }, []);

  return detailsRef;
}
