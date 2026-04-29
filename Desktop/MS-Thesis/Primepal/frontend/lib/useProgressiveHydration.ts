/**
 * Progressive hydration hook
 * Defers hydration of non-critical components to improve initial page interactivity
 */

import { useEffect, useState } from "react";

export function useProgressiveHydration() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCriticalReady, setIsCriticalReady] = useState(false);

  useEffect(() => {
    // Critical hydration (< 100ms)
    setIsCriticalReady(true);

    // Full hydration deferred (after user can interact)
    const timer = requestIdleCallback?.(() => setIsHydrated(true)) ??
      setTimeout(() => setIsHydrated(true), 100);

    return () => {
      if (typeof timer === 'number') clearTimeout(timer);
    };
  }, []);

  return { isHydrated, isCriticalReady };
}

/**
 * Defer component hydration until idle time
 * Useful for analytics, tracking, heavy widgets
 */
export function useDeferredHydration(callback: () => void, delay: number = 2000) {
  useEffect(() => {
    // Use requestIdleCallback if available (better than setTimeout)
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(callback, { timeout: delay });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    }
  }, [callback, delay]);
}
