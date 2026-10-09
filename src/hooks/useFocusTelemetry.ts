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

export function useFocusTelemetry(active: boolean, onLoss?: () => void, onRestore?: () => void) {
  const eventsRef = useRef<FocusTelemetryEvent[]>([]);
  const startRef = useRef<number>(Date.now());
  const onLossRef = useRef(onLoss);
  const onRestoreRef = useRef(onRestore);
  onLossRef.current = onLoss;
  onRestoreRef.current = onRestore;
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    eventsRef.current = [];
    startRef.current = Date.now();
    wasHiddenRef.current = false;

    const onBlur = () => {
      eventsRef.current.push({ type: "blur", atMs: Date.now() });
      onLossRef.current?.();
    };
    const onFocus = () => {
      eventsRef.current.push({ type: "focus", atMs: Date.now() });
      onRestoreRef.current?.();
    };
    const onVisibility = () => {
      if (document.hidden) {
        wasHiddenRef.current = true;
        eventsRef.current.push({ type: "tab_hidden", atMs: Date.now() });
        onLossRef.current?.();
      } else {
        eventsRef.current.push({ type: "focus", atMs: Date.now() });
        if (wasHiddenRef.current) {
          onRestoreRef.current?.();
        }
        wasHiddenRef.current = false;
      }
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
