---
name: Notification permission infrastructure
description: How to detect, re-enable, and surface notification permission state on Android and web.
---

## Pattern

`use-notification-permission.ts` hook reads `Notification.permission` from the browser API, re-checks on `visibilitychange` (catches return from OS Settings), and listens for the DOM event `notification-permission-denied` dispatched by `MusicPlayerContext`.

`MusicPlayerContext` (mount effect) adds a listener for the Capacitor plugin event `notificationPermissionPermanentlyDenied` and re-dispatches as `new CustomEvent("notification-permission-denied")` on `window`.

`MusicControlPlugin.java` (`startService()`) detects permanent denial via:
- `checkSelfPermission() != GRANTED` AND `shouldShowRequestPermissionRationale() == false`
- Fires `notifyListeners("notificationPermissionPermanentlyDenied", ...)` — audio continues, notification is just hidden

`MusicControlPlugin.java` `openNotificationSettings()` opens `Settings.ACTION_APP_NOTIFICATION_SETTINGS` with `EXTRA_APP_PACKAGE` — reliably opens the per-app notification page on Android 8+.

**Why:** `shouldShowRequestPermissionRationale()` returns false in two cases: never asked, and permanently denied. Since `MainActivity.requestNotificationPermissionIfNeeded()` always asks on first launch (before music is possible), the combination "not granted + rationale=false + after first launch" reliably means permanently denied.

**How to apply:** Import `useNotificationPermission` in any component that needs to show a "notifications blocked" banner. Call `openSettings()` from the "Go to Settings" button. The hook auto-updates when the user returns from OS Settings (Task 30 behavior). The permanent denial event is wired automatically from the native plugin (Task 31 behavior).
