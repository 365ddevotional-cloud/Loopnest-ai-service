---
name: Church Departments feature
description: Architecture decisions and gotchas for the department & ministry management system
---

## Tables
6 tables added: `church_departments`, `church_department_members`, `church_department_posts`, `church_department_events`, `church_department_tasks`, `church_department_attendance`.

## Key decisions

**Insert type exports:** The schema only auto-exports `insert*Schema` (zod) and the `$inferSelect` type. For event/task/attendance sub-tables, the `Insert*` type aliases must be manually added as `z.infer<typeof insert*Schema>` — otherwise storage.ts imports fail.

**Why:** Drizzle codegen only generates select types automatically; insert types need explicit z.infer wrapping.

**ChurchMember has no avatarUrl:** The `churchMembers` table only has `id, churchId, firebaseUid, email, displayName, role, status, invitedGroupId, inviteCodeUsed, joinedAt`. Profile fields (avatar, bio, etc.) live in `churchMemberProfiles` table. Return `avatarUrl: null` in the members API until profile joins are added.

**authHeaders() return type:** Must be explicitly typed as `Promise<Record<string, string>>` or TypeScript infers `{} | { Authorization: string }` which fails the `fetch` overload check.

**deptAuth helper:** Placed at the top of the departments section in routes.ts. Returns `{ uid, churchMember, deptMember, dept, isChurchAdmin }`. `deptMember` may be null for church admins who aren't explicitly in the dept.

**Role hierarchy:**
- Church admins (owner/lead_pastor/administrator/associate_pastor) always get full access
- Dept leaders/assistant_leaders can post announcements, add/remove members, create events/tasks
- All dept members can post messages and prayer requests

**Invite code:** 6-char uppercase alphanumeric. Stored on `church_departments`. Users join via POST `/api/churches/departments/join` with `{ inviteCode }`.

**Routes pattern:** Department-specific routes use `/api/churches/departments/:deptId/...` (no church slug in path). The `deptAuth` helper looks up the church from the department row, then verifies membership.
