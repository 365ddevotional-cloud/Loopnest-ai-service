---
name: Android build setup for 365 Daily Devotional
description: How the Android AAB is built from this PWA — Capacitor 8, SDK 36, signing setup, and where the output lives.
---

# Android Build — 365 Daily Devotional

## Architecture
This is a PWA wrapped as a native Android app using **Capacitor 8**.
- Web app is built with Vite → `dist/public/`
- Capacitor syncs those assets into `android/app/src/main/assets/public/`
- `android/` directory is the generated Android Gradle project

## Package name
`app.replit.attachment_parser__365ddevotional.twa`

## SDK versions (android/variables.gradle)
- compileSdkVersion = 36
- targetSdkVersion = 36
- minSdkVersion = 24

## Signing (android/app/build.gradle)
- Keystore: `android/app/upload-keystore.jks` (copy of workspace root `upload-keystore.jks`)
- Alias: `upload`
- Store/key password: see SIGNING_CREDENTIALS.txt
- SHA-256 fingerprint: 57:39:76:10:10:3A:40:36:19:40:6E:10:98:84:3F:A0:17:B6:37:71:64:B0:90:4B:66:78:7E:3E:D3:C3:0A:60

## Android 15/16 edge-to-edge fix
Android 15 (API 35) enforces edge-to-edge; Android 16 (API 36) removes the opt-out.
Fix applied in `android/app/src/main/res/values/styles.xml`:
- `AppTheme.NoActionBar` sets transparent status/navigation bars and `windowLayoutInDisplayCutoutMode=shortEdges`
- Capacitor BridgeActivity handles WebView insets automatically

Other manifest changes (AndroidManifest.xml):
- `android:enableOnBackInvokedCallback="true"` on <application> (predictive back gesture, required API 35+)
- `android:windowSoftInputMode="adjustResize"` on activity

## Build command
```
cd android
export ANDROID_HOME=/home/runner/android-sdk
export JAVA_HOME=<nix jdk21 path>
./gradlew bundleRelease --no-daemon
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

## Tools installed (Nix)
- jdk21 (`/nix/store/*-openjdk-21+35/`)
- Android SDK: `/home/runner/android-sdk/` (cmdline-tools, platforms/android-36, build-tools/36.0.0)

## Node.js requirement
Capacitor CLI v8 requires Node.js ≥ 22. Project upgraded to nodejs-22 module.

**Why:** Capacitor CLI 7 was already in package.json but required upgrade to 8 to match @capacitor/core and @capacitor/android 8.x.

## Background playback architecture
- `MediaPlaybackService.java` — foreground service (type: mediaPlayback), MediaSessionCompat, audio focus, MediaStyle notification, background artwork loading
- `MusicControlPlugin.java` — Capacitor bridge; exposes `updateMetadata`, `setPlaybackState`, `stop`; fires `play/pause/next/prev/stop` JS events from notification taps
- `MainActivity.java` — registers `MusicControlPlugin` before bridge init
- Web side (`MusicPlayerContext.tsx`): Capacitor guard ensures complete no-op outside Android; effect 1 (mount-only) registers listeners; effect 2 `[currentSong, isPlaying]` calls `updateMetadata` on song change, `setPlaybackState` on play/pause only
- Android 13+ `POST_NOTIFICATIONS` is requested at runtime in `MusicControlPlugin.startService()` before the first `startForegroundService` call
- Test plan: `docs/android-background-playback-test-plan.md`

**Why**: Foreground service keeps the app process alive when backgrounded so the WebView's HTMLAudioElement keeps playing; without it Android kills the process after ~1 min.

## Re-generating the AAB
1. `npm run build` (build web app)
2. `npx cap sync android` (copy assets)
3. `cd android && ./gradlew bundleRelease` (build + sign AAB)
