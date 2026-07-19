---
name: Phase D User Library Schema
description: The three tables added for user library (saved songs, favorites, download history).
---

## Tables
- `user_saved_songs` — (id, firebase_uid, song_id, saved_at) — unique(firebase_uid, song_id)
- `user_favorite_songs` — (id, firebase_uid, song_id, created_at) — unique(firebase_uid, song_id)
- `user_download_history` — (id, firebase_uid, song_id, downloaded_at) — no unique constraint (multiple downloads allowed)

## Local favorites migration
On first sign-in, `UserContext` merges `localStorage["spirittone-song-favorites"]` (array of song IDs) into DB via `POST /api/user/library/favorites/merge`, then clears local storage.

**Why:** Users may have favorited songs before creating an account. The migration ensures they don't lose local favorites on sign-in.
