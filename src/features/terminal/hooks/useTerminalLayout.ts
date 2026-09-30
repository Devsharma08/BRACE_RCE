import { useCallback, useEffect, useState, useRef, type PointerEvent as ReactPointerEvent } from "react";

// The output panel hosts one ~150-200px verdict card per test case inside its
// own scroll area — a 100px default showed less than a single card, which read
// as "the list is cut off and there is no scrollbar".
const MIN_EDITOR_PX = 200;

const getInitialOutputHeight = () => {
  if (typeof window === "undefined") return 320;
  return window.innerWidth < 768
    ? Math.max(180, Math.floor(window.innerHeight * 0.35))
    : 320;
};

export const useTerminalLayout = (opts?: {
  onSidebarAutoClose?: () => void;
  autoCloseBelowPx?: number;
  /**
   * Container-derived ceiling for the output track (see the workspace
   * ResizeObserver in Terminal.tsx). `window.innerHeight` alone overcounts —
   * the toolbar, sidebar toggle, and editor floor all consume space, so
   * dragging to innerHeight − 200 overflowed the grid and hid the scrollbar.
   */
  getMaxOutputHeight?: () => number;
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const autoCloseBelowPx = opts?.autoCloseBelowPx ?? 220;
  const onSidebarAutoClose = opts?.onSidebarAutoClose;
  const [outputHeight, setOutputHeight] = useState(getInitialOutputHeight);
  const [isOutputDragging, setIsOutputDragging] = useState(false);
  const startDragY = useRef<number | null>(null);
  const startOutputHeight = useRef<number | null>(null);

  // Keep the latest opts readable from stable callbacks/effects without
  // re-subscribing window listeners on every render. Synced in an effect:
  // writing the ref during render violates react-hooks/refs (React Compiler).
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  /** Ceiling = min(window-based fallback, container-derived max). */
  const resolveMaxOutputHeight = useCallback(() => {
    const isMobile = window.innerWidth < 768;
    const fallback = Math.max(
      150,
      Math.floor(window.innerHeight - (isMobile ? 120 : MIN_EDITOR_PX)),
    );
    const provided = optsRef.current?.getMaxOutputHeight?.();
    if (typeof provided !== "number" || !Number.isFinite(provided)) return fallback;
    return Math.max(120, Math.min(fallback, provided));
  }, []);

  /** Force the current height back under the ceiling (resize/observer driven). */
  const clampOutputHeight = useCallback(() => {
    const max = resolveMaxOutputHeight();
    setOutputHeight((current) => (current > max ? max : current));
  }, [resolveMaxOutputHeight]);

  // Window resizes shrink the workspace too — re-clamp so the output track
  // never leaves the grid without a scrollable overflow.
  useEffect(() => {
    const onResize = () => clampOutputHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampOutputHeight]);

  const startSidebarDragging = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // Ignore secondary mouse buttons so a right-click doesn't start a drag.
    if (event.button !== 0) return;
    setIsSidebarDragging(true);
    event.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.body.classList.add("dragging-active");
  }, []);

  const startOutputDragging = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    startDragY.current = event.clientY;
    startOutputHeight.current = outputHeight;
    setIsOutputDragging(true);
    event.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    document.body.classList.add("dragging-active");
  }, [outputHeight]);

  // Both drags use POINTER events rather than mouse events. Mouse events never
  // fire for touch input, so on phones/tablets these resize handles were simply
  // dead — the sidebar and output panel could not be dragged at all.
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isSidebarDragging) return;

      window.requestAnimationFrame(() => {
        const maxSidebarWidth = Math.max(30, window.innerWidth / 2);
        const nextWidth = Math.max(30, Math.min(event.clientX, maxSidebarWidth));
        setSidebarWidth(nextWidth);
      });
    };

    const handlePointerUp = () => {
      // Auto-close: if the user drags the question panel below the threshold
      // (≈200-300px), collapse it instead of leaving an unusable sliver.
      setSidebarWidth((current) => {
        if (current < autoCloseBelowPx) {
          setIsSidebarCollapsed(true);
          onSidebarAutoClose?.();
        }
        return current;
      });
      setIsSidebarDragging(false);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
      document.body.classList.remove("dragging-active");
    };

    if (isSidebarDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isSidebarDragging]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isOutputDragging) return;

      window.requestAnimationFrame(() => {
        const startY = startDragY.current ?? event.clientY;
        const startH = startOutputHeight.current ?? outputHeight;
        const delta = startY - event.clientY; // drag up => positive
        const isMobile = window.innerWidth < 768;
        const minHeight = isMobile ? 150 : 80;
        // Always leave the editor usable AND keep the track inside its actual
        // workspace container (Toolbar + editor floor), not just the viewport —
        // window.innerHeight overcounted and pushed the grid past its own
        // container, making the output scrollbar unreachable.
        const maxHeight = Math.max(minHeight, resolveMaxOutputHeight());
        const nextHeight = Math.max(minHeight, Math.min(startH + delta, maxHeight));
        setOutputHeight(nextHeight);
      });
    };

    const handlePointerUp = () => {
      setIsOutputDragging(false);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
      document.body.classList.remove("dragging-active");
    };

    if (isOutputDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isOutputDragging, outputHeight, resolveMaxOutputHeight]);

  return {
    outputHeight,
    sidebarWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setOutputHeight,
    startOutputDragging,
    startSidebarDragging,
    setSidebarWidth,
    clampOutputHeight,
    resolveMaxOutputHeight,
  };
};
