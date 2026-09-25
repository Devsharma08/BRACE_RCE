import { useCallback, useEffect, useState, useRef, type PointerEvent as ReactPointerEvent } from "react";

const getInitialOutputHeight = () => {
  if (typeof window === "undefined") return 250;
  return window.innerWidth < 768 ? Math.min(100, Math.floor(window.innerHeight * 0.3)) : 100;
};

export const useTerminalLayout = (opts?: { onSidebarAutoClose?: () => void; autoCloseBelowPx?: number }) => {
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const autoCloseBelowPx = opts?.autoCloseBelowPx ?? 220;
  const onSidebarAutoClose = opts?.onSidebarAutoClose;
  const [outputHeight, setOutputHeight] = useState(getInitialOutputHeight);
  const [isOutputDragging, setIsOutputDragging] = useState(false);
  const startDragY = useRef<number | null>(null);
  const startOutputHeight = useRef<number | null>(null);

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
        const maxHeight = Math.floor(window.innerHeight * (isMobile ? 0.90 : 1));
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
  }, [isOutputDragging, outputHeight]);

  return {
    outputHeight,
    sidebarWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setOutputHeight,
    startOutputDragging,
    startSidebarDragging,
    setSidebarWidth,
  };
};
