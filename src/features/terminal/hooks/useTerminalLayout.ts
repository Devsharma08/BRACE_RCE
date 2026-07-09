import { useCallback, useEffect, useState, type MouseEvent } from "react";

export const useTerminalLayout = () => {
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isSidebarDragging, setIsSidebarDragging] = useState(false);
  const [outputHeight, setOutputHeight] = useState(250);
  const [isOutputDragging, setIsOutputDragging] = useState(false);

  const startSidebarDragging = useCallback((event: MouseEvent<HTMLDivElement>) => {
    setIsSidebarDragging(true);
    event.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  const startOutputDragging = useCallback((event: MouseEvent<HTMLDivElement>) => {
    setIsOutputDragging(true);
    event.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      if (!isSidebarDragging) return;

      window.requestAnimationFrame(() => {
        setSidebarWidth(Math.max(150, event.clientX));
      });
    };

    const handleMouseUp = () => {
      setIsSidebarDragging(false);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
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
        const nextHeight = window.innerHeight - event.clientY;
        setOutputHeight(Math.max(40, Math.min(nextHeight, window.innerHeight - 100)));
      });
    };

    const handleMouseUp = () => {
      setIsOutputDragging(false);
      document.body.style.userSelect = "auto";
      document.body.style.cursor = "default";
    };

    if (isOutputDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isOutputDragging]);

  return {
    outputHeight,
    sidebarWidth,
    startOutputDragging,
    startSidebarDragging,
  };
};
