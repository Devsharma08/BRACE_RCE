import { useCallback, useSyncExternalStore, useState, useEffect } from "react";

/**
 * Reactive `matchMedia` hook.
 *
 * Used where CSS alone can't express the layout change — e.g. the Terminal's
 * sidebar has an inline `width` driven by a drag handle, so its positioning
 * mode (in-flow column vs. fixed overlay) has to be decided in JS.
 *
 * Built on useSyncExternalStore rather than useState+useEffect: matchMedia IS an
 * external store, and subscribing this way avoids the cascading render that
 * setState-in-effect produces on first paint.
 *
 * The third argument is the server snapshot, keeping this SSR-safe (returns
 * false until the client takes over). The `hasMounted` guard ensures the
 * initial render on both server and client matches (always `false`), then on
 * the client after hydration we re-evaluate the real media query so mobile
 * layouts don't show a flash of desktop content.
 */
export function useMediaQuery(query: string): boolean {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  const matches = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Before mount (SSR or first client render), always return false so the
  // server and client initial renders are identical. After mount, use the
  // real media-query state so mobile clients get the correct layout without
  // a flash of desktop content.
  return hasMounted ? matches : false;
}

/** Matches Tailwind's `md` breakpoint (768px). */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
