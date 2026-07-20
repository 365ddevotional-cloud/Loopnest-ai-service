---
name: Phase F Devotional Account Sync
description: Architecture decisions for devotional saves, history, streak, and notes
---

## localStorage keys (guest users)
- `"devotional-saves"` — array of devotional IDs (same key exported from UserContext as LOCAL_DEV_SAVE_KEY)
- `"devotional-reading-streak"` — `{ currentStreak, longestStreak, lastReadDate }` JSON

## Sign-in merge flow
- `mergeLocalDevotionalSaves` fires in UserContext.tsx `onAuthStateChanged`, same pattern as song favorites merge
- POSTs to `/api/user/devotional/saved/merge` with `{ devotionalIds: number[] }`
- On success clears localStorage key and invalidates query cache

## Streak calculation
- Client-side only (client knows local timezone)
- `computeNewStreak()` in `useDevotionalAccount.ts`: if lastReadDate === today → no change; if lastReadDate === yesterday → streak++; else → streak = 1
- Synced to DB via PUT `/api/user/devotional/streak` only when date actually advances

## DevotionalCard props
- `showNotes?: boolean` — controls visibility of the Personal Note section (only passed as `true` from `SingleDevotional.tsx`)
- History tracking fires on every mount via `useEffect(() => { recordRead(); }, [recordRead])`
- `readRecorded` ref prevents double-firing in StrictMode

## Security
- All endpoints use `requireUser` middleware (Bearer token → Firebase UID)
- Notes: user can only read/write/delete their own note (`WHERE firebase_uid = uid AND devotional_id = id`)
- No cross-user access possible

## Tables added
- `user_saved_devotionals` (firebase_uid, devotional_id UNIQUE)
- `user_devotional_history` (firebase_uid, devotional_id UNIQUE, first_opened_at, last_opened_at)
- `user_devotional_streak` (firebase_uid UNIQUE, current_streak, longest_streak, last_read_date)
- `user_devotional_notes` (firebase_uid, devotional_id UNIQUE, note_text, updated_at)

**Why:** Devotional favorites/saves did not previously exist in DB. Phase F adds them as a separate system from song favorites. Do not mix these tables.
