import { isFeatureEnabled } from "./features";

/**
 * Cloudflare Turnstile site key.
 *
 * No fallback to Cloudflare's always-pass test key ('1x00000000000000000000AA'):
 * that key renders a real-looking widget which never actually blocks anything,
 * which is a false promise of security. When no key is configured the widget is
 * not rendered and an honest notice is shown instead.
 */
export const TURNSTILE_SITE_KEY = (
  import.meta.env.VITE_TURNSTILE_SITE_KEY || ""
).trim();

/**
 * Turnstile is only active when the feature flag is on AND a real site key is
 * configured. Both are required — a flag with no key renders a broken widget,
 * and a key with the flag off leaves the check silently disabled.
 */
export const TURNSTILE_ENABLED =
  isFeatureEnabled("turnstile") && TURNSTILE_SITE_KEY.length > 0;
