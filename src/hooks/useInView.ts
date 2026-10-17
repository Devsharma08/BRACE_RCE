import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

/**
 * useInView — one-shot "has this element scrolled into view?" observer.
 *
 * The home sections use it to gate their reveal animation: the element renders
 * with inline `opacity: 0`, and once the observer first reports it inside the
 * viewport `inView` flips on permanently (the observer disconnects). Consumers
 * add their animation class + stagger delay only while `inView` is true, so the
 * fade plays as the content scrolls in — unlike the old animate-on-mount
 * behaviour where every section had already finished fading before the user
 * reached it.
 *
 * The default rootMargin triggers ~10% of a viewport BEFORE the element
 * crosses in, so the `from` state (held by the animation's backwards
 * fill-mode) is already applied while it is still off-screen — no flash.
 *
 * Reduced motion starts already revealed (and the CSS `animate-reveal` rule
 * disables the animation), and environments without IntersectionObserver (e.g.
 * jsdom) start revealed too, so content can never be stuck at opacity 0.
 */
type UseInViewOptions = {
  /** CSS root-margin for the observation box. */
  rootMargin?: string;
};

export function useInView<T extends HTMLElement>({
  // Trigger well before the element crosses the fold: the one-time cost of a
  // reveal (React commit + layerization/raster of a viewport-sized subtree)
  // then lands while the section is still off-screen, instead of mid-scroll
  // where it drops frames — and a fast fling can't outrun it as easily.
  rootMargin = "0px 0px 30% 0px",
}: UseInViewOptions = {}) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<T | null>(null);
  // Reduced motion starts revealed (the CSS `animate-reveal` rule disables the
  // animation in that mode); environments without IntersectionObserver (jsdom)
  // start revealed too, so content can never be stuck at opacity 0.
  const [inView, setInView] = useState(
    () => reducedMotion || typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    if (inView) return;
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    // Note: `reducedMotion` deliberately does NOT tear the observer down — if
    // the OS setting flips on mid-session, the scroll-in reveal still fires
    // (and renders instantly, since `animation: none` applies in that mode).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Reveal when intersecting, OR when the element is already ABOVE
          // the viewport — a fast fling can move an element past the root
          // between observer samples; without this it would stay at
          // opacity 0 until the user scrolls back up.
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            setInView(true);
            return;
          }
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    // Also runs once the reveal flips inView, releasing the observer.
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}