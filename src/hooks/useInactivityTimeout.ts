import { useEffect, useRef, useCallback } from "react";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove", 
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

interface UseInactivityTimeoutOptions {
  /** Timeout in milliseconds (default: 30 minutes) */
  timeout?: number;
  /** Callback when timeout is reached */
  onTimeout: () => void;
  /** Whether the timeout is enabled (default: true) */
  enabled?: boolean;
  /** Warning callback before timeout (receives seconds remaining) */
  onWarning?: (secondsRemaining: number) => void;
  /** Seconds before timeout to trigger warning (default: 60) */
  warningSeconds?: number;
}

/**
 * Hook to detect user inactivity and trigger logout/callback
 * Tracks mouse, keyboard, scroll, and touch events
 */
export function useInactivityTimeout({
  timeout = 30 * 60 * 1000, // 30 minutes default
  onTimeout,
  enabled = true,
  onWarning,
  warningSeconds = 60,
}: UseInactivityTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setInterval>>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearInterval(warningRef.current);

    if (!enabled) return;

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.debug("[Inactivity] Session timed out after", timeout / 1000 / 60, "minutes");
      }
      onTimeout();
    }, timeout);

    // Set warning interval if callback provided
    if (onWarning) {
      const warningStart = timeout - warningSeconds * 1000;
      
      setTimeout(() => {
        if (!enabled) return;
        
        warningRef.current = setInterval(() => {
          const elapsed = Date.now() - lastActivityRef.current;
          const remaining = Math.max(0, Math.ceil((timeout - elapsed) / 1000));
          
          if (remaining <= warningSeconds && remaining > 0) {
            onWarning(remaining);
          }
        }, 1000);
      }, warningStart);
    }
  }, [timeout, onTimeout, enabled, onWarning, warningSeconds]);

  // Handle activity events
  const handleActivity = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearInterval(warningRef.current);
      return;
    }

    // Initial setup
    resetTimeout();

    // Add event listeners
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Also track visibility changes (user switches tabs)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearInterval(warningRef.current);
      
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, handleActivity, resetTimeout]);

  return {
    /** Manually reset the inactivity timer */
    resetTimeout,
    /** Get seconds since last activity */
    getInactiveSeconds: () => Math.floor((Date.now() - lastActivityRef.current) / 1000),
  };
}
