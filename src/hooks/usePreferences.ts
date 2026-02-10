import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "omnistream_prefs";

interface Preferences {
  notificationSound: boolean;
  browserNotifications: boolean;
}

const defaults: Preferences = {
  notificationSound: true,
  browserNotifications: true,
};

function getPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

function setPrefs(update: Partial<Preferences>) {
  const current = getPrefs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...update }));
  window.dispatchEvent(new Event("prefs-change"));
}

export function usePreferences(): { prefs: Preferences; toggleNotificationSound: () => void; toggleBrowserNotifications: () => void } {
  const [prefs, setLocal] = useState<Preferences>(() => getPrefs());

  useEffect(() => {
    const sync = () => setLocal(getPrefs());
    window.addEventListener("prefs-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("prefs-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleNotificationSound = useCallback(() => {
    setPrefs({ notificationSound: !getPrefs().notificationSound });
  }, []);

  const toggleBrowserNotifications = useCallback(() => {
    setPrefs({ browserNotifications: !getPrefs().browserNotifications });
  }, []);

  return { prefs, toggleNotificationSound, toggleBrowserNotifications };
}
