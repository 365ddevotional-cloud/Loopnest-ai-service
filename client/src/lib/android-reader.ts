import { Capacitor } from "@capacitor/core";
import { isAndroidAppReferrer, isAndroidAppUserAgent } from "@shared/android-reader";

export function isAndroidReader(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.getPlatform() === "android" || isAndroidAppUserAgent(navigator.userAgent)) return true;
  const appLaunch = isAndroidAppReferrer(document.referrer);
  try {
    const key = "365dd-android-reader";
    if (appLaunch) sessionStorage.setItem(key, "1");
    return sessionStorage.getItem(key) === "1";
  } catch {
    return appLaunch;
  }
}
