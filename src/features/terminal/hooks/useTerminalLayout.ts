import { useCallback, useEffect, useState, useRef, type MouseEvent } from "react";

const getInitialOutputHeight = () => {
  if (typeof window === "undefined") return 250;
  return window.innerWidth < 768 ? Math.min(200, Math.floor(window.innerHeight * 0.3)) : 250;
};

export const useTerminalLayout = () => {
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const [outputHeight, setOutputHeight] = useState(getInitialOutputHeight);
  const [isOutputDragging, setIsOutputDragging] = useState(false);
  const startDragY = useRef<number | null>(null);
  const startOutputHeight = useRef<number | null>(null);

  const startSidebarDragging = useCallback((event: MouseEvent<HTMLDivElement>) => {
    setIsSidebarDragging(true);
    event.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.body.classList.add("dragging-active");
  }, []);

  const startOutputDragging = useCallback((event: MouseEvent<HTMLDivElement>) => {
    startDragY.current = event.clientY;
    startOutputHeight.current = outputHeight;
    setIsOutputDragging(true);
    event.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    document.body.classList.add("dragging-active");
  }, [outputHeight]);

  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      if (!isSidebarDragging) return;

      window.requestAnimationFrame(() => {
        const maxSidebarWidth = Math.max(30, window.innerWidth/2);
        const nextWidth = Math.max(30, Math.min(event.clientX, maxSidebarWidth));
        setSidebarWidth(nextWidth);
      });
    };

    const handleMouseUp = () => {
      setIsSidebarDragging(false);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
      document.body.classList.remove("dragging-active");
    };

    if (isSidebarDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSidebarDragging]);

  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
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

    const handleMouseUp = () => {
      setIsOutputDragging(false);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
      document.body.classList.remove("dragging-active");
    };

    if (isOutputDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isOutputDragging, outputHeight]);

  return {
    outputHeight,
    sidebarWidth,    setOutputHeight,    startOutputDragging,
    startSidebarDragging,
    setSidebarWidth,
  };
};
