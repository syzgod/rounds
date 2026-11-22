export type TextSize = "normal" | "large" | "larger"

export const TEXT_SIZES: readonly TextSize[] = ["normal", "large", "larger"]
const STORAGE_KEY = "textSize"

export function isTextSize(value: unknown): value is TextSize {
  return value === "normal" || value === "large" || value === "larger"
}

export function readTextSize(): TextSize {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isTextSize(saved)) return saved
  } catch {
    // Storage can be blocked; use the default.
  }
  return "normal"
}

/** Sets `data-text-size` on <html> (index.css scales the root font) and saves it. */
export function applyTextSize(size: TextSize): void {
  document.documentElement.dataset.textSize = size
  try {
    window.localStorage.setItem(STORAGE_KEY, size)
  } catch {
    // Storage can be blocked; the choice lasts until reload.
  }
}
