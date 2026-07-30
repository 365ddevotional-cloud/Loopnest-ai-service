---
name: SpiritTone Music system — admin features
description: What's built, what's pending, key patterns for the music admin in Admin.tsx
---

# SpiritTone Music Admin — current state

## What is built (as of 2026-07-30)

### Batch Upload (SongsAdmin, Admin.tsx)
- `BatchSong` interface has ALL fields matching the single-song Dialog (including `labelLogoFile/Preview`, `downloadStatus`, `videoDownloadStatus`, `collectionIds`, `songType`).
- `makeBatchSong()` factory function creates a new blank/file-based BatchSong with correct defaults.
- Each batch card expands to show the complete single-song form in the same field order.
- `processOneBatchSong(bsong, asDraft)` uploads audio, logo, cover, video then POSTs to /api/songs, then assigns collections.

### Song Type (Part 5)
- `song_type TEXT` column added to `songs` DB table (migration: `scripts/migrate-songtype.mjs`).
- `songType: text("song_type")` in `shared/schema.ts`.
- `SONG_TYPES` constant at module level in Admin.tsx: `["Vocal","Instrumental","Choir","Podcast","Message","Children","Other"]`.
- Select dropdown in single-song Dialog and batch card form (after Genre+Language row).

### Language Support (Part 4)
- `LANGUAGES` constant at module level in Admin.tsx (19 languages from English to Pidgin English).
- Language field is now a `<Select>` in both the single-song Dialog and batch card form (was free-text Input).

### Search & Filtering (Part 12)
- Filter state in SongsAdmin: `searchQuery`, `filterLanguage`, `filterGenre`, `filterSongType`, `filterVisibility`.
- `filteredSongs` computed const (not state) derived from `songs` after filters.
- Filter bar rendered in CardContent above the song list.
- Song rows show language badge (non-English only) and songType badge.

### Duplicate Song (Part 2)
- `openDuplicate(song, mode)` function in SongsAdmin.
- Modes: `"copy"` | `"translation"` | `"instrumental"` | `"remix"`.
- All modes clear: audioUrl, videoUrl, videoDownloadStatus, coverImageUrl.
- copy/translation also clear: language, lyrics.
- instrumental also clears lyrics, sets songType = "Instrumental".
- Opens the Edit Dialog pre-filled so admin can complete and save.
- Duplicate dropdown (DropdownMenu) added to each song row before the Edit button.

### Collections (Part 6)
- `song_collections` + `song_collection_items` tables.
- Full CRUD in admin. Collections section below the songs list.
- Batch cards show checkbox list for collection assignment.

### Song Analytics (Part 9)
- `song_engagement_events` table (play, like, share, download events with 30-min session dedup for plays).
- Stats button on each song row opens an analytics card.

## Constants (module-level in Admin.tsx, before BatchSong interface)
- `LANGUAGES` — array of 19 language strings.
- `SONG_TYPES` — array of 7 type strings.

## Not yet built (proposed as tasks #9, #10, #11)
- Master Song / language-version linking (task #9).
- Bulk editor for multi-song updates (task #10).
- Archive / schedule / version history (task #11).
- Part 3 (Master Song public switcher), Part 8 (Bulk Editor), Parts 10+11 (lifecycle).
