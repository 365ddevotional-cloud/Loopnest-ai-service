---
name: User Profile + Analytics schema
description: New tables and patterns added for user profiles, activity tracking, country support, and admin analytics/oversight.
---

## Tables added
- `user_profiles` — PK is `firebase_uid` (text). Columns: display_name, email, country, profile_picture_url, email_consent_ministry, email_consent_notifications, created_at, last_active_at.
- `user_activity_days` — composite unique on (firebase_uid, activity_date). Used for DAU/WAU/MAU aggregation.
- `churches.country` — text column added to existing churches table.

## Critical pattern: db.execute() returns QueryResult, not an array
`db.execute(sql`...`)` returns `QueryResult<Record<string, unknown>>`. Do NOT use array destructuring:
```ts
// WRONG
const [row] = await db.execute(sql`SELECT ...`);
// CORRECT
const res = await db.execute(sql`SELECT ...`);
const row = res.rows[0];
```

## Activity tracking
- `UserContext.tsx` calls `recordDailyActivity(firebaseUser)` non-blocking on sign-in.
- Client guards with `localStorage` key `activity-pinged-YYYY-MM-DD` to avoid redundant pings in the same session.
- Server endpoint `POST /api/user/activity` is idempotent via DB unique constraint.

## Admin tabs added
- `church-oversight` — per-church stats (members, departments, announcements, sermons, last activity), plus summary + country breakdowns. Uses raw SQL JOIN across churches + church_members + departments etc.
- `analytics` — DAU/WAU/MAU + total/new users + 30-day daily trend + users by country. DB-backed only; anonymous visits not counted.

**Why:** Google Analytics integration requires a service-account key; we document this gap but don't block the feature on it.

## Profile picture
- Stored as object storage path in `user_profiles.profile_picture_url`.
- Served via `GET /api/user/profile/picture` which streams from object storage (requires Firebase Auth header).
- Upload uses existing `useUpload` hook → `/api/uploads/request-url` presigned URL pattern.

## Email consent
Two boolean columns: `email_consent_ministry` (ministry updates/newsletters) and `email_consent_notifications` (devotional/prayer reminders). Toggled from AccountPage immediately via PATCH /api/user/profile.
