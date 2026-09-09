import { useEffect, useRef } from "react";

/**
 * Focus-loss telemetry hook (ROADMAP §3).
 * Records blur / tab-hidden / focus events with timestamps while `active`.
 * Returns a ref holding the event list + helpers to snapshot/clear.
 */
export interface FocusTelemetryEvent {
  type: "blur" | "tab_hidden" | "focus";
  atMs: number;
}

export function useFocusTelemetry(active: boolean) {
  const eventsRef = useRef<FocusTelemetryEvent[]>([]);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!active) return;
    eventsRef.current = [];
    startRef.current = Date.now();

    const onBlur = () => {
      eventsRef.current.push({ type: "blur", atMs: Date.now() });
    };
    const onFocus = () => {
      eventsRef.current.push({ type: "focus", atMs: Date.now() });
    };
    const onVisibility = () => {
      if (document.hidden) eventsRef.current.push({ type: "tab_hidden", atMs: Date.now() });
      else eventsRef.current.push({ type: "focus", atMs: Date.now() });
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  return {
    eventsRef,
    startMs: () => startRef.current,
    snapshot: () => [...eventsRef.current],
    clear: () => {
      eventsRef.current = [];
      startRef.current = Date.now();
    },
  };
}
