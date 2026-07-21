---
name: Church Mode production improvements
description: Schema, API, and UI additions for church mode production-ready features — branding, giving reports, sermon center, enhanced announcements.
---

# Church Mode Production Improvements

## Schema additions (shared/schema.ts)
- `churches`: `bannerUrl`, `themeColor`
- `churchSermons`: `pdfNotesUrl`, `outlineUrl`, `imageUrl`, `scheduledDate`
- `churchAnnouncements`: `imageUrl`, `pdfUrl`, `externalLink`
- New tables: `churchSermonBookmarks` (sermonId, churchId, firebaseUid), `churchSermonNotes` (sermonId, churchId, firebaseUid, body)

## Storage methods added
- `updateChurchBranding(churchId, {logoUrl,bannerUrl,themeColor})`
- `toggleSermonBookmark(sermonId, churchId, firebaseUid)` → returns boolean (added/removed)
- `getSermonBookmarks(churchId, firebaseUid)` → number[]
- `upsertSermonNote(sermonId, churchId, firebaseUid, body)`
- `getSermonNote(sermonId, firebaseUid)`

## API endpoints added (server/routes.ts)
- `PATCH /api/churches/:id/branding` — leader-only, updates logo/banner/themeColor
- `POST /api/churches/:id/sermons/:sermonId/bookmark` — member toggle
- `GET /api/churches/:id/bookmarks` — returns array of bookmarked sermon IDs
- `GET /api/churches/:id/sermons/:sermonId/note` — get member note
- `PUT /api/churches/:id/sermons/:sermonId/note` — upsert member note
- `GET /api/churches/:id/giving/reports` — returns {today,week,month,year,all,recent}
- `GET /api/churches/:id/giving/export-csv` — leader-only CSV download

## Email privacy
- `/api/churches/:id/members` strips email from non-leader responses server-side

## Admin tabs added (ChurchAdminPage.tsx)
- **branding**: logoUrl, bannerUrl, themeColor (color picker + presets)
- **reports**: summary cards (today/week/month/year/all-time), recent transactions table, CSV export button

## ChurchModeShell themeColor
- Auto-detects light/dark from hex color using luminance formula
- Derives nav bg, active color, ring color from themeColor
- Banner image overlay with gradient

**Why:** Churches need visual identity, financial reporting, and rich sermon/announcement content — these are gating features for paid church subscriptions.
