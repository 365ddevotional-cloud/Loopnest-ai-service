---
name: Group Mode Phase 1 architecture
description: Family/Group Mode — lightweight private groups system, implementation decisions and patterns
---

## Route structure
- `/groups` → GroupsHome (lists all user's groups)
- `/groups/create` → GroupCreate
- `/groups/join` → GroupJoin
- `/group/:id/*` → GroupModeShell (suppresses global Header/Footer via App.tsx shell detection)

## Auth pattern
All group API routes use `extractGroupAuth(req, res)` helper (top-level in routes.ts), which calls `verifyFirebaseToken` + decodes displayName/email from JWT payload. Returns `{ uid, displayName, email } | null`.

## DB migration workaround
`drizzle-kit push` gets stuck in interactive mode when new tables could be confused with renames of existing tables. Used direct `node -e "..."` with pg client to CREATE IF NOT EXISTS instead.

## Invite code format
`generateGroupCode()` produces 8-char format `XXXX-XXXX` using chars `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no confusable chars). Stored in `groups.invite_code` (UNIQUE).

## Key decisions
- Groups use numeric IDs (not slugs) in routes — `groups.id` is the identifier
- `group_messages` table aliased as `groupMessagesTable` in storage.ts imports to avoid name collision with schema table
- AccountPage gets a "My Groups" entry card (HandHeart icon) — main nav NOT modified (per spec)
- Announcement posting restricted to owner/moderator roles only
- Prayer "praying count" increments without deduplication (by design for Phase 1)

**Why:** Keep Phase 1 lightweight — no real-time websockets, no complex moderation, no push notifications. These can be Phase 2 additions.
