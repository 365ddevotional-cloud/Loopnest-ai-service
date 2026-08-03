# Android Background Playback — Test Plan

> **Scope**: Verify every code path in `MediaPlaybackService`, `MusicControlPlugin`,
> and the Capacitor bridge in `MusicPlayerContext`. These tests require an Android
> device or emulator running the signed APK (not the dev web app).
>
> **Do not run on**: iOS, desktop browser, or the Replit preview pane — the Capacitor
> guard in `MusicPlayerContext` makes all native calls no-ops outside the Android shell.

---

## Prerequisites

| Item | Requirement |
|---|---|
| Device / emulator | Android 8+ (API 26). Test Android 13+ (API 33) separately for notification permission. |
| APK | Built from the current branch with `release` signing config. |
| USB debugging | Enabled. Use `adb logcat -s MusicControlPlugin MediaPlaybackService` to watch native logs. |
| Songs | At least 2 songs available via the in-app music library (requires live network). |

---

## 1 — Service Start & Notification Appearance

### 1a. Basic notification (Android ≤ 12)

1. Open the app → navigate to **Music** tab → tap a song to start playing.
2. Pull down the notification shade.

**Expected:**
- A MediaStyle notification appears with the song title as content title and artist as content text.
- Three compact-view actions are visible: ⏮ Previous · ⏸ Pause · ⏭ Next.
- A **Stop** (×) button appears in the expanded view.
- Small icon (`ic_stat_notification`) is shown in the status bar.
- If the song has cover art, it appears as the notification's large icon (may take 1–2 s to load).

### 1b. Notification permission dialog (Android 13+)

1. On a fresh install on Android 13+ device, open the app and start playing a song.

**Expected:**
- An OS-level "Allow notifications?" dialog appears once.
- Tapping **Allow**: notification appears in the shade.
- Tapping **Deny**: no notification, but audio continues — app does not crash.
- On subsequent plays, no dialog appears (permission state cached by OS).

---

## 2 — Background Audio Continuity

### 2a. Home button

1. Start a song.
2. Press the **Home** button.
3. Wait 30 seconds.

**Expected:**
- Audio continues uninterrupted.
- Notification remains in the shade showing the playing state (⏸ Pause button visible).
- No `ANR` or `Process killed` messages in `adb logcat`.

### 2b. App switcher / recents

1. Start a song.
2. Open the recents screen and swipe to a different app.
3. Wait 30 seconds.

**Expected:** Same as 2a.

### 2c. Screen lock

1. Start a song.
2. Lock the screen (power button).
3. Wait 30 seconds, then unlock.

**Expected:**
- Audio continues through the lock period.
- Lock screen shows MediaStyle controls (title, artist, artwork if loaded, transport buttons).
- Tapping the lock-screen play/pause button works.
- After unlocking, the in-app MiniPlayer reflects the correct playing state.

### 2d. Extended background (10+ minutes)

1. Start a song, background the app.
2. Wait 10+ minutes.

**Expected:**
- Audio continues for the full duration.
- Notification is not dismissed by the OS.
- `adb logcat` shows no `onTrimMemory` kills.

---

## 3 — Notification Button Controls

For each control: start a song, background the app, then test from the notification shade.

### 3a. Pause → Play from notification

1. Tap ⏸ **Pause** in the notification.

**Expected:**
- Notification button immediately changes to ▶ Play (no waiting for JS round-trip).
- Audio pauses.
- Tap ▶ **Play** → audio resumes, button returns to ⏸ Pause.
- Bring app to foreground: MiniPlayer shows correct play/pause state.

### 3b. Skip Next from notification

1. Start a **queue** (tap "Play All" on the music library page) so multiple tracks are queued.
2. Background the app.
3. Tap ⏭ **Next** in the notification.

**Expected:**
- Notification title updates to the next song within 2 s.
- Audio switches to the new song.
- If the artwork URL changed, the large icon updates after ~1–2 s.

### 3c. Skip Previous from notification

1. While a song is playing (after at least one next skip), tap ⏮ **Previous**.

**Expected:**
- If > 3 s into the track: restarts the current song.
- If ≤ 3 s into the track: skips to previous song (queue logic mirrors the in-app button).
- Notification title updates accordingly.

### 3d. Stop / Swipe away notification

1. Tap the **Stop** (×) button in the notification expanded view.

**Expected:**
- Notification dismissed.
- Audio stops.
- Bring app to foreground: MiniPlayer is gone (player closed).

2. Restart playback. Then **swipe away** the notification.

**Expected:** Same as above — the `deleteIntent` fires `ACTION_STOP`.

---

## 4 — Audio Focus Handling

### 4a. Incoming phone call

1. Start a song.
2. Receive a phone call (or use `adb shell am broadcast -a android.intent.action.CALL` to simulate AUDIOFOCUS_LOSS).

**Expected:**
- Audio pauses when the call connects (`AUDIOFOCUS_LOSS`).
- Notification switches to ▶ Play button.
- After the call ends, audio resumes automatically (`AUDIOFOCUS_GAIN`).
- Notification switches back to ⏸ Pause.

### 4b. Navigation / assistant (transient focus loss)

1. Start a song.
2. Trigger Google Assistant or a navigation instruction.

**Expected:**
- Audio pauses or ducks (`AUDIOFOCUS_LOSS_TRANSIENT` or `AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK`).
- After the assistant/nav finishes: audio resumes at full volume.

### 4c. Another media app starts

1. Start a song in the 365 app.
2. Start playing a YouTube video (or any media app).

**Expected:**
- 365 audio pauses (`AUDIOFOCUS_LOSS`).
- Notification shows ▶ Play.
- Closing/pausing the other app: 365 audio resumes (`AUDIOFOCUS_GAIN`).

---

## 5 — Web UI ↔ Native Sync

### 5a. In-app play/pause → notification update

1. Keep the app in the **foreground**.
2. Tap the in-app play/pause button in the MiniPlayer or SongDetail page.

**Expected:**
- Notification button updates within ~200 ms.
- Verify in `adb logcat` that `setPlaybackState` is called (not `updateMetadata`) — artwork reload should NOT be triggered on a plain play/pause toggle.

### 5b. In-app next/prev → notification metadata update

1. While in the foreground, tap ⏭ next in the MiniPlayer.

**Expected:**
- Notification title updates to the new song within ~500 ms.
- `adb logcat` should show `updateMetadata` (full update, not `setPlaybackState`).

### 5c. Close player from web UI

1. Open the MiniPlayer → tap ✕ → **"Stop music"** in the dismiss dialog.

**Expected:**
- Notification dismissed immediately.
- `adb logcat`: `MediaPlaybackService.stopForegroundService()` called.

### 5d. Close player from notification → web UI sync

1. Background the app.
2. Tap **Stop** in the notification (or swipe it away).
3. Bring app to foreground.

**Expected:**
- MiniPlayer is gone.
- No orphaned audio playing.
- Starting a new song works normally.

---

## 6 — Bluetooth & Vehicle Controls

### 6a. Headset/headphone buttons

1. Connect Bluetooth headphones.
2. Start a song and background the app.
3. Use the headphone's inline button (single press = play/pause, double = next, triple = prev on most headsets).

**Expected:**
- Controls work via `MediaSessionCompat` hardware button callbacks.
- `adb logcat` shows `MediaSessionCompat.Callback.onPlay/Pause/SkipToNext/SkipToPrevious`.

### 6b. Android Auto / Bluetooth car display

1. Connect to a car head unit or Android Auto (or use the Android Auto Desktop Head Unit emulator).
2. Start a song.

**Expected:**
- Car display shows: song title, artist, album ("365 Daily Devotional"), artwork (if available).
- Prev/play-pause/next controls on the steering wheel or screen work.
- See Task #23 for fallback artwork when songs have no cover image.

---

## 7 — Edge Cases

### 7a. Song with no cover art

1. Start a song that has no `coverImageUrl` (empty string sent in `artworkUrl`).

**Expected:**
- Notification appears without a large icon (no artwork space allocated).
- No crash or blank image.
- `adb logcat`: `MediaPlaybackService` skips the background artwork thread.

### 7b. Artwork URL that fails to load

1. (Simulated) Temporarily modify a song's `coverImageUrl` to an unreachable URL (or block the domain in device network settings).
2. Start the song.

**Expected:**
- Notification appears immediately without the large icon.
- Background artwork thread catches the exception silently (`catch (Exception ignored)`).
- No crash, no retry storm.

### 7c. Very rapid next/prev taps

1. Tap ⏭ next 5 times in quick succession from the notification shade.

**Expected:**
- Each tap fires `ACTION_NEXT` → `onNativeNext()` → `playNext()`.
- Audio stabilises on one song after the taps settle.
- No `ConcurrentModificationException` or `IllegalStateException` in `adb logcat`.

### 7d. App process killed by OS (low memory)

1. Start a song and background the app.
2. Open many other memory-intensive apps until the OS sends `onTrimMemory`.

**Expected** (this is a genuine limitation of the TWA architecture):
- The `MediaPlaybackService` uses `START_NOT_STICKY` — it will not restart automatically if killed.
- Audio stops.
- Notification disappears.
- This is acceptable — the foreground service significantly raises the OOM threshold vs. no service at all.

### 7e. Rotation / configuration change

1. Start a song.
2. Rotate the device.

**Expected:**
- Audio continues uninterrupted.
- MiniPlayer state preserved.
- Notification unchanged.

---

## 8 — logcat Signatures to Watch

| Scenario | Expected logcat tag / message |
|---|---|
| Service started | `MediaPlaybackService: onCreate` |
| Metadata update | `MusicControlPlugin: updateMetadata title=<song>` |
| Play-state only | `MusicControlPlugin: setPlaybackState isPlaying=<bool>` |
| Artwork download | `MediaPlaybackService: artwork loaded` |
| Notification button tap | `MediaPlaybackService: BroadcastReceiver action=<ACTION_*>` |
| Audio focus loss | `MediaPlaybackService: onAudioFocusChange LOSS` |
| Audio focus gain | `MediaPlaybackService: onAudioFocusChange GAIN` |
| Service stopped | `MediaPlaybackService: stopForegroundService` |
| Permission dialog | `ActivityCompat: requestPermissions POST_NOTIFICATIONS` |

> To stream only relevant lines: `adb logcat -s MusicControlPlugin:V MediaPlaybackService:V`

---

## 9 — What Cannot Be Tested in This Environment

| Limitation | Reason |
|---|---|
| Actual APK install | No connected device; APK generation deferred to a later build task. |
| Actual background audio | Requires a real Android process; the Capacitor guard in `MusicPlayerContext` returns early in all non-Android environments. |
| OS-level OOM behaviour | Requires sustained memory pressure on device. |
| Android Auto head unit | Requires physical hardware or ADH emulator setup. |
| Permission dialog UI | Requires Android 13+ runtime. |

All **code paths** have been validated statically (see section 10 below).

---

## 10 — Static Code Verification (completed ✅)

| Check | Result |
|---|---|
| `ic_stat_notification` icon present in all 5 density buckets | ✅ |
| `<service foregroundServiceType="mediaPlayback">` in Manifest | ✅ |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS`, `WAKE_LOCK`, `INTERNET` in Manifest | ✅ |
| `androidx.media:media:1.7.0` in `app/build.gradle` | ✅ |
| `MusicControlPlugin` registered in `MainActivity.registerPlugin()` | ✅ |
| Android 13+ `RECEIVER_NOT_EXPORTED` flag on `BroadcastReceiver` | ✅ |
| Android 13+ `POST_NOTIFICATIONS` runtime request in `startService()` | ✅ |
| Audio focus requested on service start, abandoned on destroy | ✅ |
| Artwork fetched on background thread, checks URL changed before re-download | ✅ |
| `START_NOT_STICKY` return value (no ghost restarts) | ✅ |
| Web effect 1 (mount-only): registers 5 listeners, cleans up on unmount | ✅ |
| Web effect 2 (`[currentSong, isPlaying]`): `updateMetadata` on song change, `setPlaybackState` on play-state only, `stop` when song null | ✅ |
| `audio.addEventListener("play/pause")` → `setIsPlaying()` → React state in sync with native events | ✅ |
| Web build passes with zero errors | ✅ |
| Web code is a complete no-op outside the Capacitor Android shell | ✅ |
