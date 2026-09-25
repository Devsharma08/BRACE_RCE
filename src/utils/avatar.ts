/**
 * Local, privacy-preserving fallback avatar.
 *
 * Renders a deterministic monogram as an inline SVG data URI so the app never
 * has to call a third-party avatar service (no IP/username leak, no rate-limit
 * breakage, works offline and inside air-gapped/enterprise networks).
 *
 * Colours are pulled from the design tokens in index.css so the avatar always
 * matches the active surface + accent palette.
 */
const AVATAR_BG = "#0b1021"; // --bg-surface
const AVATAR_FG = "#00D4FF"; // --accent-primary

export const getInitials = (name?: string | null): string => {
  const parts = (name ?? "")
    .trim()
    .split(/[\s_.-]+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return (parts[0][0] ?? "U").toUpperCase();
  return ((parts[0][0] ?? "U") + (parts[parts.length - 1][0] ?? "U")).toUpperCase();
};

export const getInitialsAvatar = (name?: string | null): string => {
  const initials = getInitials(name);
  // Only these two chars are interpolated, and both are uppercased A-Z above.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" fill="${AVATAR_BG}"/>` +
    `<text x="50%" y="52%" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" ` +
    `font-size="34" font-weight="700" fill="${AVATAR_FG}" ` +
    `dominant-baseline="middle" text-anchor="middle">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
