---
name: Church Mode Architecture
description: Routing strategy, visual tokens, auth pattern, and shell design for Church Mode (Phase 2A)
---

## Route Layout Split

- `/church`, `/church/create`, `/church/join`, `/church/join/:code` — use normal app Header/Footer (same as any other page in AppContent)
- `/church/:slug`, `/church/:slug/members`, `/church/:slug/admin` — use `ChurchModeShell` (no global Header/Footer); detected in AppContent with: `location.startsWith("/church/") && !["create","join"].includes(location.split("/")[2])`

**Why:** Church spaces need a distinct visual environment. The gateway pages remain in the main app shell so users feel grounded before entering a church space.

## Route Ordering in App.tsx Switch

Must be in this order to avoid slug matching gateway paths:
1. `/church/create`
2. `/church/join/:code`
3. `/church/join`
4. `/church/:slug/members`
5. `/church/:slug/admin`
6. `/church/:slug`
7. `/church`

## Visual Tokens (ChurchModeShell)

- Header background: `#1a2744` (deep navy)
- Page background: `#f5efe6` (warm cream)
- Gold accent: `#b8962e`
- Header text: `#faf6f0`
- Geometric texture: SVG cross-hatch overlay at 12% opacity

## API Auth Pattern

All church API calls require Firebase token:
```typescript
const token = await getIdToken(); // from useUser()
headers: { Authorization: `Bearer ${token}` }
```
Server verifies via `verifyFirebaseToken()` inside `getUid()` helper in routes.ts.

## Church Roles

Defined in shared/schema.ts as `CHURCH_ROLES` const array and `CHURCH_ROLE_LABELS` record:
- owner, lead_pastor, administrator, ministry_leader, member
- Only owner/administrator can manage members/roles
- owner/administrator/lead_pastor can manage invitations and settings

## Hamburger Menu Accordion

Six collapsible groups: Daily Faith, Worship & Media, Prayer & Community, Church & Ministry, My Account, Administration. Auto-opens the group matching the current route on component mount.
