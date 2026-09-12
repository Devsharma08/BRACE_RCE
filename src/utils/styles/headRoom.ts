import { useEffect, useRef, useState } from "react";

// The header auto-hides only when the user has scrolled INTO the content.
// Fixed-height pages (e.g. the friends workspace) often have little or no
// window scroll — previously the inactivity timer hid the header there and
// made nav links permanently unclickable (had to refresh). At/near the top
// of any page the header now stays visible and interactive.
const SCROLL_HIDE_THRESHOLD = 100;

export const UseHeadroom = () => {
  const [visible, setVisible] = useState(true);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(window.scrollY);

  useEffect(() => {
    const clearHideTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const hideAfterInactivity = () => {
      clearHideTimer();
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

      if (direction === "up") {
        // Scrolling UP → immediately show header and keep it shown
        setVisible(true);
        clearHideTimer();
      } else if (currentScrollY > SCROLL_HIDE_THRESHOLD) {
        // Scrolled deep into content → show, then hide after 3s of inactivity
        setVisible(true);
        hideAfterInactivity();
      } else {
        // Near the top of the page → always keep the header visible
        setVisible(true);
        clearHideTimer();
      }

      lastScrollY.current = Math.max(currentScrollY, 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Start the inactivity timer only if the page is already scrolled down
    if (window.scrollY > SCROLL_HIDE_THRESHOLD) {
      hideAfterInactivity();
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearHideTimer();
    };
  }, []);

  return {
    visible,
    scrollDirection,
  };
};