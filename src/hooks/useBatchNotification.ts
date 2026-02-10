import { useCallback, useRef } from "react";
import { usePreferences } from "./usePreferences";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

function sendBrowserNotification(done: number, failed: number) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Batch Fetch Complete", {
    body: `${done} succeeded${failed > 0 ? `, ${failed} failed` : ""}`,
    icon: "/favicon.ico",
  });
}

export function useBatchNotification() {
  const permissionRequested = useRef(false);
  const { prefs } = usePreferences();

  const requestPermission = useCallback(() => {
    if (!("Notification" in window) || permissionRequested.current) return;
    if (Notification.permission === "default") {
      permissionRequested.current = true;
      Notification.requestPermission();
    }
  }, []);

  const notify = useCallback((done: number, failed: number) => {
    if (prefs.notificationSound) playBeep();
    if (prefs.browserNotifications) sendBrowserNotification(done, failed);
  }, [prefs.notificationSound, prefs.browserNotifications]);

  return { notify, requestPermission };
}
