---
name: Music Player Continuity & Media Session
description: Root cause of music stopping on navigation, MiniPlayer visibility fix, Media Session API integration, AudioContext resume pattern.
---

## Root causes of music stopping during SPA navigation

**Problem 1 — MiniPlayer not visible on church/group routes**: `AppContent` conditionally returns different JSX trees based on route type. For `/church/:slug/...` and `/group/:id/...` it returns only `<Router />` with no `<MiniPlayer />`. Users assumed music stopped because there was no visible player control.

**Fix**: Move `<MiniPlayer />` out of `AppContent`'s normal-layout branch and into `App()` as a sibling to `<AppContent />` inside `<TooltipProvider>`. Now always rendered regardless of route.

**Why**: `MusicPlayerProvider` is above `AppContent`, so state and audio element survive all route changes. The issue was purely visual.

**Problem 2 — AudioContext suspension on visibility change**: `MusicVisualizer` creates an `AudioContext` and routes the audio element through it via `createMediaElementSource`. If the browser suspends the AudioContext (e.g. when the tab goes hidden on mobile), the audio output is cut even though `HTMLAudioElement.currentTime` keeps advancing. Nothing was resuming it.

**Fix**: Store the `AudioContext` on the audio element as `(audioElement as any)._audioCtx = ctx` in `MusicVisualizer`. In `MusicPlayerContext`, add a `visibilitychange` listener that resumes the context when the page returns to foreground:
```typescript
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const ctx = (audioRef.current as any)._audioCtx as AudioContext | undefined;
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  }
});
```

## Media Session API integration

Added to `MusicPlayerContext.tsx` — three `useEffect` blocks:
1. **Metadata + action handlers** (deps: `[currentSong]`): sets `navigator.mediaSession.metadata` with title/artist/album/artwork; registers play, pause, previoustrack, nexttrack, seekbackward, seekforward, seekto, stop.
2. **Playback state** (deps: `[isPlaying, currentSong]`): sets `navigator.mediaSession.playbackState`.
3. **Position state** (deps: `[currentTime, duration, playbackRate, currentSong]`): calls `setPositionState` for accurate lock-screen scrubber.

**Why**: Without Media Session, the OS has no metadata to show on the lock screen and physical/Bluetooth play controls don't work.

**How to apply**: Action handlers use `playNextRef`, `playPrevRef`, `closePlayerRef` — refs that stay in sync with the latest stable `useCallback` instances. `seekto` and `stop` are wrapped in `try/catch` because some browsers don't support them.

## MiniPlayer improvements

- **Collapse**: `localStorage` key `miniplayer-collapsed`; collapsed view shows thin strip (artwork + title + progress + play/pause + expand button)
- **Dismiss dialog**: X button opens a bottom sheet asking "Hide player · keep music playing" vs "Stop music". Choosing "Hide" sets `dismissed` state (no MiniPlayer rendered) until a new song starts.
- **Auto-restore after dismiss**: `prevSongIdRef` tracks the last song ID; when it changes, `dismissed` is reset so the MiniPlayer reappears.
- **Safe area**: `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}` on the fixed container — covers iPhone home indicator and Android navigation bar.
- **All routes**: Now always rendered because it lives at `App()` level.

## Key architecture facts (stable)
- Single `HTMLAudioElement` created once: `audioRef = useRef(new Audio())` inside `MusicPlayerProvider`
- `MusicPlayerProvider` wraps `AppContent` in `App()` — survives ALL route changes
- `MusicVisualizer` creates `AudioContext` lazily on first render; WeakMap guards against duplicate creation on remount
- `playSongRef`, `playNextRef`, `playPrevRef`, `closePlayerRef` — all kept current via `useEffect` sync; used inside Media Session and `ended` handlers to avoid stale closures
