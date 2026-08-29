import { useEffect, useRef, useState } from "react";

export const UseHeadroom = () => {
  const [visible, setVisible] = useState(true);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(window.scrollY);

  useEffect(() => {
    const hideAfterInactivity = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 3000);
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const difference = currentScrollY - lastScrollY.current;

      // Ignore tiny movements
      if (Math.abs(difference) < 10) {
        return;
      }

      const direction = difference > 0 ? "down" : "up";

      setScrollDirection(direction);

      // Scrolling UP → immediately show header
      if (direction === "up") {
        setVisible(true);
      }

      // Any meaningful scroll resets the inactivity timer
      setVisible(true);
      hideAfterInactivity();

      lastScrollY.current = Math.max(currentScrollY, 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Start 3-second inactivity timer
    hideAfterInactivity();

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    visible,
    scrollDirection,
  };
};