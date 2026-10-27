import { useState, useEffect, useRef, useCallback } from 'react';

interface UseProximityHoverOptions {
  /** Distance in pixels from element edge to trigger proximity */
  threshold?: number;
  /** Whether to enable the proximity detection */
  enabled?: boolean;
}

interface UseProximityHoverReturn<T extends HTMLElement | SVGElement = HTMLElement> {
  /** True when cursor is within threshold distance of element */
  isProximate: boolean;
  /** Ref to attach to the target element */
  ref: React.RefObject<T | null>;
  /** Distance from cursor to element center (for fine-grained control) */
  distance: number;
}

/**
 * Hook that detects when the user's cursor approaches an element within a threshold distance.
 * Uses requestAnimationFrame for non-blocking, async distance calculation.
 * Triggers proximity state when cursor enters the threshold zone.
 */
export function useProximityHover<T extends HTMLElement | SVGElement = HTMLElement>(
  options: UseProximityHoverOptions = {}
): UseProximityHoverReturn<T> {
  const { threshold = 120, enabled = true } = options;
  const [isProximate, setIsProximate] = useState(false);
  const [distance, setDistance] = useState(Infinity);
  const ref = useRef<T>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  // Track mouse position globally (non-blocking)
  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled]);

  // Calculate distance on animation frame (non-blocking)
  const calculateDistance = useCallback(() => {
    if (!enabled || !ref.current) {
      animationFrameRef.current = requestAnimationFrame(calculateDistance);
      return;
    }

    const element = ref.current;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = mousePosRef.current.x - centerX;
    const dy = mousePosRef.current.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    setDistance(dist);

    // Check if cursor is within threshold of element bounds
    const horizontalDist = Math.max(0, Math.abs(dx) - rect.width / 2);
    const verticalDist = Math.max(0, Math.abs(dy) - rect.height / 2);
    const proximityDist = Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);

    setIsProximate(proximityDist <= threshold);

    animationFrameRef.current = requestAnimationFrame(calculateDistance);
  }, [enabled, threshold]);

  // Start the animation loop
  useEffect(() => {
    if (!enabled) return;
    animationFrameRef.current = requestAnimationFrame(calculateDistance);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [calculateDistance, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return { isProximate, ref, distance };
}

export default useProximityHover;