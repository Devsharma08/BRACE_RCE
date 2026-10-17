import { useEffect, useState } from "react";

/**
 * BracePreloader — one-shot intro for a FRESH page load (refresh or first
 * visit). Mounted in Root.tsx, which React Router never remounts on
 * client-side navigation, so transitions between pages never replay it — and
 * deliberately has NO sessionStorage gate, because a refresh must play it.
 *
 * Choreography (transform/opacity only → compositor/GPU layers, no layout):
 *   0ms     "Brace RCE v2.0" fades in from 20px below           (600ms)
 *   600ms   hold for 500ms
 *   1100ms  text slides from centre up and out of the viewport  (700ms),
 *           while the dark curtain rises from the bottom edge in sync,
 *           covering the text; same background colour as the overlay,
 *           so unmounting is seamless.
 * Body scrolling is locked for the duration.
 */
export default function BracePreloader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion skips the choreography — just clear the veil quickly.
    const total = reduced ? 250 : 1900;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const timer = setTimeout(() => {
      // Restore scrolling — set on BOTH html and body to be safe across
      // browsers that consult either element for the scroll container.
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      setDone(true);
    }, total);

    return () => {
      clearTimeout(timer);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  if (done) return null;

  return (
    <div className="preloader-overlay" aria-hidden="true">
      <div className="preloader-text">
        Brace RCE <span className="preloader-version">v2.0</span>
      </div>
      {/* Painted after the text, so its rise covers the text on the way up. */}
      <div className="preloader-curtain" />
    </div>
  );
}

export { BracePreloader };
