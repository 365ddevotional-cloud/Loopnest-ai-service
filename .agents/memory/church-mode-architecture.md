---
name: Church Mode architecture
description: Routing strategy, visual tokens, auth pattern, shell design, and all modules after the major expansion.
---

## Route Layout Split

- `/church`, `/church/create`, `/church/join`, `/church/join/:code` — use normal app Header/Footer
- `/church/:slug`, `/church/:slug/*` — use `ChurchModeShell` (no global Header/Footer); detected in AppContent with: `location.startsWith("/church/") && !["create","join"].includes(location.split("/")[2])`

**Why:** Church spaces need a distinct visual environment. Gateway pages remain in main shell so users feel grounded before entering a church space.

## Route Ordering in App.tsx Switch

Must be in this order (static paths before `:slug` paths):
1. `/church/create`
2. `/church/join/:code`
3. `/church/join`
4. `/church/:slug/sermons`
5. `/church/:slug/announcements`
6. `/church/:slug/groups`
7. `/church/:slug/prayer`
8. `/church/:slug/members`
9. `/church/:slug/admin`
10. `/church/:slug`
11. `/church`

## Visual Tokens (ChurchModeShell)

- Header background: `#1a2744` (deep navy)
- Page background: `#f8f4ee` (warm linen)
- Gold accent: `#b8962e` / active gold: `#d4a83a`
- Header text: `#f5ede0`
- Linen texture: SVG dot-grid overlay at 40% opacity on page background

## API Auth Pattern

All church API calls require Firebase token:
```typescript
const token = await getIdToken(); // from useUser()
headers: { Authorization: `Bearer ${token}` }
```
Server verifies via `verifyFirebaseToken()` inside `getUid()` helper in routes.ts.

## Church Roles (9 total)

Hierarchy: owner > lead_pastor > administrator > associate_pastor > ministry_leader > group_leader > counselor > prayer_team > member

- `ADMIN_ROLES` = owner, lead_pastor, administrator, associate_pastor — can manage church
- Confidential prayers visible to ADMIN_ROLES + counselor + prayer_team
- `CHURCH_ROLES` array and `CHURCH_ROLE_LABELS` map exported from shared/schema.ts

## Pages & Components

- `ChurchModeShell` — nav shell with 7 nav items (Home, Sermons, Announcements, Groups, Prayer, Members, Admin)
- `ChurchHome` — dashboard with stats, recent announcements/sermons, admin quick link
- `ChurchSermons` — sermon archive with video/audio links
- `ChurchAnnouncements` — pinned-first announcements
- `ChurchGroups` — group grid with join/leave, member counts, categories
- `ChurchPrayer` — prayer wall with confidential flag, "I'm Praying" button, admin mark-answered
- `ChurchMembers` — grouped by leadership/congregation, role dropdowns for admins
- `ChurchAdminPage` — 7-tab admin: Settings, Invitations, Sermons, Announcements, Members, Prayer, Insights

## Global Admin Moderation (Admin.tsx)

"Churches" tab added to main admin dashboard.
`ChurchModerationAdmin` component at end of Admin.tsx.
API: `GET /api/admin/churches`, `PATCH /api/admin/churches/:id/status`
Auth: admin Bearer password (same as rest of admin).

## New DB Tables

church_sermons, church_announcements, church_groups, church_group_members, church_prayer_requests, church_activity_log — all migrated via drizzle-kit push.

## Copy Invite Link Pattern

Uses clipboard API with execCommand fallback.
Production URL const: `PROD_URL = "https://365dailydevotional.com"`.
`window.location.hostname === "localhost"` → use `window.location.origin`, else use `PROD_URL`.
