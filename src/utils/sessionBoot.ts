/**
 * One-shot "play animation only once per browser tab" helpers.
 *
 * The home hero (BRACE RCE boot) and the leaderboard reveal are visual
 * boot sequences. We persist a per-session flag so they only run on the
 * first screen load of a tab — navigating back to the page later renders
 * the content statically (hover/glow effects stay enabled).
 */

const FALLBACK: Set<string> = new Set();

function storageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.sessionStorage;
  } catch {
    return false;
  }
}

/** Returns true when the boot already played in this tab session. */
export function hasBooted(key: string): boolean {
  if (storageAvailable()) {
    try {
      return window.sessionStorage.getItem(`brace_rce_boot::${key}`) === "1";
    } catch {
      /* fall through to in-memory fallback */
    }
  }
  return FALLBACK.has(key);
}

/** Marks the boot as played (idempotent). */
export function markBooted(key: string): void {
  if (storageAvailable()) {
    try {
      window.sessionStorage.setItem(`brace_rce_boot::${key}`, "1");
      return;
    } catch {
      /* fall through to in-memory fallback */
    }
  }
  FALLBACK.add(key);
}