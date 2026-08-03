/**
 * useNotificationPermission
 *
 * Tracks the OS notification permission state and exposes helpers for:
 *   - opening the system notification settings (Android deep-link / web fallback)
 *   - re-checking permission on demand or after returning from background
 *
 * Tasks addressed:
 *   #30 – auto-dismiss the "blocked" banner when user returns from Settings
 *   #31 – surface permanent denial state proactively (fed by native plugin event)
 */

import { useState, useEffect, useCallback } from "react";

export type NotifPermission = "granted" | "denied" | "prompt" | "unavailable";

export interface UseNotificationPermissionResult {
  /** Current OS-level notification permission. */
  permission: NotifPermission;
  /** True while an async recheck is in flight. */
  checking: boolean;
  /**
   * Open the system notification settings for this app (Android) or
   * show a toast-style guide for the web browser.
   * Returns true if the native deep-link was triggered.
   */
  openSettings: () => Promise<boolean>;
  /** Manually re-read the current permission state. */
  recheck: () => Promise<void>;
}

/** Read the current Notification permission from the browser API. */
function readWebPermission(): NotifPermission {
  if (typeof window === "undefined") return "unavailable";
  const notif = (window as any).Notification;
  if (!notif) return "unavailable";
  const p: string = notif.permission ?? "prompt";
  if (p === "granted" || p === "denied" || p === "default") {
    return p === "default" ? "prompt" : (p as NotifPermission);
  }
  return "prompt";
}

export function useNotificationPermission(): UseNotificationPermissionResult {
  const [permission, setPermission] = useState<NotifPermission>(() =>
    readWebPermission()
  );
  const [checking, setChecking] = useState(false);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      setPermission(readWebPermission());
    } finally {
      setChecking(false);
    }
  }, []);

  // Initial read on mount.
  useEffect(() => {
    recheck();
  }, [recheck]);

  // Task #30: re-check whenever the user returns to the foreground.
  // This catches the case where the user went to Android/browser Settings
  // and toggled the permission, then came back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") recheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [recheck]);

  // Task #31: the native MusicControlPlugin fires "notificationPermissionPermanentlyDenied"
  // which MusicPlayerContext re-dispatches as this DOM event so any component can react.
  useEffect(() => {
    const onDenied = () => setPermission("denied");
    window.addEventListener("notification-permission-denied", onDenied);
    return () =>
      window.removeEventListener("notification-permission-denied", onDenied);
  }, []);

  const openSettings = useCallback(async (): Promise<boolean> => {
    try {
      const cap = (window as any).Capacitor;
      if (cap?.isNativePlatform?.() && cap.getPlatform?.() === "android") {
        // Use the native MusicControlPlugin.openNotificationSettings() bridge.
        const { registerPlugin } = await import("@capacitor/core");
        const plugin = registerPlugin<any>("MusicControl");
        await plugin.openNotificationSettings();
        return true;
      }
    } catch {
      // Plugin not available (dev browser) — fall through to web path.
    }
    // Web fallback: we can't open browser settings programmatically;
    // the calling UI should explain which browser setting to change.
    return false;
  }, []);

  return { permission, checking, openSettings, recheck };
}
