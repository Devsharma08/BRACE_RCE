import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  /** Root margin for intersection detection (like CSS margin) */
  rootMargin?: string;
  /** Threshold(s) for intersection ratio */
  threshold?: number | number[];
  /** Only trigger once (don't re-trigger when scrolling out and back in) */
  triggerOnce?: boolean;
  /** Whether the observer is enabled */
  enabled?: boolean;
}

interface UseIntersectionObserverReturn<T extends HTMLElement | SVGElement = HTMLElement> {
  /** True when element is intersecting (visible in viewport) */
  isIntersecting: boolean;
  /** Ref to attach to the target element */
  ref: React.RefObject<T | null>;
  /** The intersection ratio (0 to 1) */
  intersectionRatio: number;
}

/**
 * Hook that detects when an element enters the viewport using Intersection Observer API.
 * Triggers animations when the element becomes visible during scroll.
 * Non-blocking, uses native browser API.
 */
export function useIntersectionObserver<T extends HTMLElement | SVGElement = HTMLElement>(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn<T> {
  const { 
    rootMargin = '0px 0px -10% 0px', 
    threshold = 0.1, 
    triggerOnce = true, 
    enabled = true 
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);
  const ref = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef(false);

  const setRef = useCallback((node: T | null) => {
    ref.current = node;
    
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!enabled || !node) return;

    // Don't re-observe if already triggered and triggerOnce is true
    if (triggerOnce && hasTriggeredRef.current && isIntersecting) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          const intersecting = entry.isIntersecting;
          setIntersectionRatio(entry.intersectionRatio);
          setIsIntersecting(intersecting);
          
          if (intersecting && triggerOnce) {
            hasTriggeredRef.current = true;
          }
        }
      },
      { rootMargin, threshold }
    );

    observerRef.current.observe(node);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold, triggerOnce, enabled, isIntersecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Expose ref as a callback ref for proper cleanup
  return { 
    isIntersecting, 
    ref: setRef as unknown as React.RefObject<T | null>,
    intersectionRatio 
  };
}

export default useIntersectionObserver;