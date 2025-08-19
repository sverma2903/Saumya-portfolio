import { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
const getInitialState = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialState);
  const framerReducedMotion = useReducedMotion();
  useEffect(() => {
    // Prefer framer-motion's value when it is a definite boolean.
    if (typeof framerReducedMotion === 'boolean') {
      setPrefersReducedMotion(framerReducedMotion);
      return; // nothing to clean up
    }

    // Fallback for environments where the hook might not provide a boolean.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const listener = (event?: MediaQueryListEvent) => {
        // event may be undefined in some fallbacks, so read matches directly
        setPrefersReducedMotion(event?.matches ?? mediaQuery.matches);
      };

      // Modern browsers support addEventListener on MediaQueryList; fall back to addListener.
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', listener as EventListener);
        return () => {
          mediaQuery.removeEventListener('change', listener as EventListener);
        };
      } else if (typeof (mediaQuery as any).addListener === 'function') {
        (mediaQuery as any).addListener(listener);
        return () => {
          (mediaQuery as any).removeListener(listener);
        };
      }
    }
  }, [framerReducedMotion]);
  return prefersReducedMotion;
}