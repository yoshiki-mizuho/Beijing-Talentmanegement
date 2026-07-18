export function getTrappedFocusIndex(
  currentIndex: number,
  focusableCount: number,
  direction: "forward" | "backward"
) {
  if (focusableCount <= 0) return -1;

  if (direction === "backward") {
    return currentIndex <= 0 ? focusableCount - 1 : currentIndex - 1;
  }

  return currentIndex < 0 || currentIndex >= focusableCount - 1
    ? 0
    : currentIndex + 1;
}