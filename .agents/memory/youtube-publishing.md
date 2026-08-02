---
name: YouTube Publishing System
description: Full YouTube publishing architecture — OAuth, defaults, expanded upload dialog, scheduling, thumbnails.
---

## Key facts

**OAuth**: In-memory `ytOAuthStates` Map with 10-min TTL (single-use). If server restarts between auth-URL generation and callback, state is lost → `invalid_state` error. This is the expected failure mode; user must re-run OAuth from scratch.

**DB tables**: `youtube_connection` (id=1 singleton), `youtube_song_uploads` (per-song record), `song_upload_defaults` (id=1 singleton with yt_* columns).

**song_upload_defaults yt_ columns** (all added via ALTER TABLE in migrate-upload-defaults.ts):
`yt_privacy`, `yt_made_for_kids`, `yt_synthetic_content`, `yt_category_id`, `yt_language`, `yt_license`, `yt_allow_embedding`, `yt_public_stats`, `yt_notify_subscribers`, `yt_default_tags`, `yt_description_footer`, `yt_thumbnail_choice`, `yt_scheduling_timezone`, `yt_scheduling_behavior`

**youtube_song_uploads columns** (added via ALTER TABLE):
`scheduled_at`, `thumbnail_url`, `thumbnail_status`, `made_for_kids`, `synthetic_content`, `category_id`, `tags`, `license`, `allow_embedding`, `public_stats`, `notify_subscribers`

**Routes**: `GET/PUT /api/admin/youtube/defaults` for the defaults panel. `POST /api/admin/youtube/upload/:songId` accepts all metadata + scheduledAt + thumbnailUrl; background task refreshes token, initiates resumable upload, optionally calls thumbnails.set after videoId is returned.

**Scheduling**: When `scheduledAt` is provided, server forces `privacyStatus: "private"` and sets `status.publishAt` in YouTube snippet. Client shows blue notice.

**Thumbnail**: After video upload returns `youtubeVideoId`, server calls `thumbnails.set?videoId=...&uploadType=media`. Failure is non-fatal — saved as `thumbnailStatus: "failed"`.

**Dialog flow**: "Post to YouTube" in action menu calls `openYtDialog(song)` → populates all fields from `ytDefaults` + song metadata. Two-step: form → confirm → `handleYtUpload`. "Confirm and Publish to YouTube" button.

**Why `ytStatus` query always enabled**: Changed from `enabled: showYouTube` to `enabled: true` so action-menu items (Post to YouTube / disabled states) render correctly without opening the section first.

**URL param detection**: `useEffect` on mount detects `?youtube_connected=1` → invalidates ytStatus query, shows toast, removes param. Also handles `?youtube_error=`.

**API scopes**: `youtube.upload` + `youtube.readonly`. `youtube.upload` is sufficient for thumbnails.set per Google docs.

**API verification notice**: Always shown in dialog — "This Google API project has not completed YouTube API verification. YouTube may restrict API uploads to Private visibility until the project passes its required audit." Does NOT block upload.
