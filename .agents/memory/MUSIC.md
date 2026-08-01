---
name: SpiritTone Music admin features
description: What's built vs pending for the SpiritTone music player, admin tools, and YouTube publishing
---

## Built and shipped

### Phase 1 — Playback Modes + Queue
- `repeatMode` extended to `"none" | "one" | "play-all" | "all"` (DB stores plain text, backward-compatible)
- `activeQueue`, `queueIndex`, `setQueue`, `clearQueue`, `playPrev`, `audioElement` added to MusicPlayerContext
- Shuffle pins the start song, then shuffles the rest
- `onEnded` advances queue for play-all / loops for all
- Volume saved/restored from `spirittone-volume` in localStorage; `onInput` + `onChange` for mobile

### Phase 2 — Song Upload Defaults
- `song_upload_defaults` table (id=1 singleton upsert) in schema + migration
- `GET /api/admin/song-upload-defaults` + `PUT /api/admin/song-upload-defaults` routes
- Admin.tsx SongsAdmin: state/query/save wired; `makeBatchSong` + `openNew` prefill from defaults
- "Song Upload Defaults" collapsible card shown above the song list

### Phase 3 — Music Visualizer
- `MusicVisualizer.tsx` — Web Audio API canvas, 16 bars ~48px tall, WeakMap guard (one MediaElementAudioSourceNode per element), `prefers-reduced-motion` aware
- `audioElement` exposed from context; visualizer shown in SongDetail when song is active

### Phase 4 — Mobile Volume + 3-row SongDetail layout
- Volume input uses `onInput` + `onChange`; iOS and Android detected separately
- SongDetail restructured: scrubber row → volume row → PlaybackModeBar row
- `SkipBack`/`SkipForward` queue-aware buttons added

### Phase 5 — YouTube Publishing
- `youtube_connection` + `youtube_song_uploads` tables in schema + migration
- 8 server routes added: status, auth-url, callback (OAuth2), disconnect, upload (resumable, background), upload-status
- Uses `google-auth-library` `OAuth2Client`; tokens stored server-side only
- Admin.tsx SongsAdmin: "YouTube Publishing" card; connect/disconnect; Upload modal per-song; "Post to YouTube" in song dropdown (shown only when song has videoUrl AND channel is connected)
- Requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` Replit Secrets to be set before YouTube connect works

### Components + helpers shipped
- `PlaybackModeBar.tsx` — 5-button compact mode selector (Normal/Repeat One/Play All/Repeat All/Shuffle), `sm`/`md` size
- `MusicVisualizer.tsx` — Web Audio API canvas visualizer
- Music.tsx — language/genre/type/search filters + "Play All" per-collection + global Play All
- MiniPlayer.tsx — queue position indicator, prev/next with queue awareness, PlaybackModeBar when queue active

## Pending / not yet done
- `upsertUserMusicSettings` storage type still uses old `"none"|"one"|"all"` — needs `"play-all"` added (non-breaking at runtime)
- `PlaybackModeBar` "Play All" button uses `<ListMusic>` with a CSS class that doesn't exist — should swap to `<ListOrdered>` or `<ListChecks>`
- YouTube Secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) not yet requested from user
- Master-song linking, bulk editor, archive/schedule/versions still pending (separate tasks)

**Why:** WeakMap guard is critical — calling `createMediaElementSource` twice on the same `<audio>` throws a DOMException that silently breaks audio across all future plays in the session.
**How to apply:** Any component that needs a Web Audio node from the player audio element must go through the WeakMap in MusicVisualizer or through the same guard pattern.
