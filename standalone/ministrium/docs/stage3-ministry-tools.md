# Stage 3 — church and ministry tools

## Connected scope

The existing Church Mode workflows were reviewed in `source/client/pages/ChurchSermons.tsx`, `ChurchAnnouncements.tsx`, `ChurchDepartments.tsx`, `ChurchMembers.tsx`, and `ChurchPublicEvents.tsx`. Their ministry concepts and fields are adapted into the independent workspace model. The old numeric church IDs, devotional storage and legacy route handlers remain disabled; no existing devotional records are copied.

| Original workflow | Ministrium workspace implementation |
|---|---|
| Sermon title, speaker, description and media | Leader-created teaching with title, description, speaker, scripture and existing HTTPS media/resource link |
| Sermon bookmarks and notes | Per-account notes and bookmark; even workspace leaders cannot read another member's study through the API |
| Announcements | Shared or leader-only drafts, pinned items, edit versions, archive and restore |
| Events | Leader-managed title, details, UTC date/time, viewer-local display, location and existing HTTPS link |
| Departments | Team descriptions, joining/leaving, counts; team email list restricted to leaders |
| Membership and leadership | Owner/admin member list; only owner appoints/demotes administrators or removes members; owner protected; action audit |
| Prayer and conversation | Existing Stage 2 community tools retained alongside the new tools |

Entry: `/workspace/:id/tools`, linked from each private workspace. `/tools-preview` is a clearly labeled in-memory example with synthetic content and no live role changes.

## Authorization and data behavior

Every operation verifies current workspace membership. Leaders manage content; members see published, unarchived resources. Resource type/scope/author cannot be forged through request payloads. Event timestamps and HTTPS links are validated. Version checks reject stale edits. Owner-only role changes are serialized with content permission checks and recorded in an audit table. Removing a member clears their private study/team membership and revokes unused invitations for that email in the workspace.

Member emails, drafts and audit data are never included in public preview data. Shared content is still private to workspace members; public ministry pages are a later feature. Lists are bounded (100 resources per view, 200 people per view, 50 audit actions); the pilot allows 1,000 active resources per workspace. There is no recurring polling. Manual refresh checks for new content.

Migration `003_ministry_tools.sql` adds tables only in the dedicated `ministrium` schema. Migrations 001 and 002 are unchanged. Explicit deployment migrations now apply and verify all three checksums. Existing PostgreSQL, Firebase and Railway services are reused; no new paid service, domain or dependency was added.

## Local verification

TypeScript, production build and all 32 tests pass. New embedded PostgreSQL/HTTP tests cover all four resource kinds, draft privacy, stale edit rejection, archive/restore, strict inputs, cross-workspace denial, private study, idempotent department joining, leader-only team emails, owner protection, administrator promotion/demotion, audit and removal. Browser sample checks cover sermon creation, archive/restore, study editing, event creation, announcement drafts, joining teams and the membership-change review screen.

Live deployment and synthetic-account verification are recorded after activation; local results alone are not a live-completion claim. Uploads, public pages, automatic mail, payments, payout handling and built-in voice/video remain outside this stage.
