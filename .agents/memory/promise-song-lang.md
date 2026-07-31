---
name: Promise card and song language improvements
description: Key lessons from adding custom language support and fixing the promise card footer.
---

# Promise card + song language improvements

## Logo file location
`365-logo.jpeg` and `google-play-badge.jpeg` are in the ROOT `public/` directory, not `client/public/`.
Express only serves `client/public/` and `dist/public/` — so `/365-logo.jpeg` was 404 until copied to `client/public/`.

**Why:** The static middleware in server/index.ts only mounts `client/public` and `dist/public`. Root `public/` is NOT served.

**How to apply:** Any new static assets intended for the frontend must go in `client/public/` (or `dist/public/` for build output).

## useUser hook location
`useUser` is exported from `@/contexts/UserContext`, NOT `@/hooks/useUser` (that path doesn't exist).

## Custom language sentinel in Admin.tsx
`CUSTOM_LANG = "__custom__"` is the sentinel Select value. When the Select value equals CUSTOM_LANG, a text input appears. The actual language string to save is `song.customLanguage.trim()` (batch) or `editCustomLanguage.trim()` (edit dialog). Never save `"__custom__"` to the DB.

## show_picture_on_promise DB column
Added via `server/migrate-promise-picture.ts` which runs idempotently on server start.
The column is `show_picture_on_promise BOOLEAN NOT NULL DEFAULT FALSE` on `user_profiles`.
PATCH /api/user/profile allows `showPictureOnPromise` in addition to other fields.

## Privacy: user picture excluded from share
`sharePromiseAsImage` generates its own canvas — it does NOT capture the React component DOM. So user pictures in the card footer are automatically excluded from shared images.

## Promise card props
`PromiseCard3D` accepts `userPictureUrl?: string` and `showUserPicture?: boolean`.
Only the `PromisePopup` component passes these (fetches user profile if signed in).
The `DailyPromise` page renders PromiseCard3D without user picture (acceptable per minimum-change scope).
