const STORAGE_KEY = "initials"

/** Same rule as the API: a letter, then up to 7 letters, dots, hyphens or spaces. */
const INITIALS = /^\p{L}[\p{L}. -]{0,7}$/u

export function isValidInitials(value: string): boolean {
  return INITIALS.test(value.trim())
}

/** Initials saved in this browser; null when none (or storage is blocked). */
export function readInitials(): string | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved && isValidInitials(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveInitials(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value.trim())
  } catch {
    // Storage can be blocked; the initials then last for this session only.
  }
}
