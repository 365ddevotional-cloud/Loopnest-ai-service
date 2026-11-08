# Stage 4 — private groups

Family prayer groups, prayer circles and discipleship groups use their own invitation-only `group` workspace. Members can live in different countries and do not have to register as a church. The base country is descriptive, not a membership restriction. Basic group tools are free to group users.

## Completed implementation

- Retains verified-email invitations, private conversations and prayer requests from earlier stages.
- Group leaders add ordered study lessons with scripture references, material, a reflection question and optional existing HTTPS resource link. Drafts remain leader-only; lessons can be edited with version checks and archived/restored.
- Members read shared lessons and keep their own completion record and reflections. These are private even from group leaders. Version checks prevent one device silently overwriting another device's reflection. Removing a member clears their progress and access.
- Gatherings use absolute timestamps plus the organizer's time zone. A viewer can display the same instant in common time zones. The organizer's local time is shown alongside it. Scheduling still uses the editing user's browser-local time; nonexistent daylight-saving local times are rejected.
- Leaders edit, cancel and restore recent/upcoming gatherings. Cancelled gatherings disappear for members; leaders can include them for review. Stale edits/cancellations are rejected by version checks.
- Uses existing meeting links. Built-in voice/video, recurring calls, automatic reminders and paid calling are not introduced.

Routes: `/workspace/:id/study` for a real group and `/study-preview` for a clearly labeled temporary sample. Group workspaces show **Open group study**. The existing `/group-preview` links to sample study. Sample content is illustrative; no lessons are automatically copied into a real group.

## Storage, authorization and cost

Migration `004_private_group_study.sql` adds group lessons, per-member progress and gathering version/cancellation fields only in Ministrium's dedicated schema. Previous migration checksums are unchanged. The lesson list omits full lesson material and private reflections; readers fetch a chosen lesson separately. Each group supports up to 200 lessons in this pilot. Queries are bounded and do not poll automatically.

Current membership, group type and leadership role are checked in transactions. Cross-group requests and forged user/scope fields are rejected. Reflection reads/writes always use the verified token UID, never a client-supplied account ID. New tables have organization/member foreign keys and supporting indexes. Existing Firebase/PostgreSQL/Railway services are reused. No payment service, storage bucket, paid messaging provider or extra subscription is activated.

## Verification

TypeScript and production build pass. All 40 tests pass, including group-only access, draft privacy, cross-group isolation, private progress/reflections, stale saves, lesson archive/restore, removal cleanup, meeting edit/cancellation/restore and Chicago/Lagos/daylight-saving conversions. Browser sample checks cover lesson creation, completion and reflection save, archive/restore, viewing a gathering in another time zone, meeting edits and cancellation/restore.

## Live activation — 2026-10-30

Source commit `39180238ec6a42214bdee6ae5452e6c9ab14a547` deployed successfully in Railway deployment `dcbbba5f-11c4-4168-84c0-0fed9fea3b38`. Predeploy logs confirm migrations 1–3 already current and migration 4 applied. Runtime reports workspace mode with live payments disabled.

Two synthetic verified Firebase accounts passed 33 live HTTP checks: authentication, published lesson visibility, private drafts, separate-group isolation, leader-only authoring, member-only reflections/completion, forged UID rejection, stale save/edit conflicts, lesson archive/restore preserving progress, meeting timestamps, leader edits, cancellation/restore and persistence after fresh sign-in. These use only synthetic test data in explicitly named test workspaces.

The live browser sample at https://ministrium-production.up.railway.app/study-preview was opened and its reflection/completion controls checked. Screenshot: `stage4-live-groups.jpg`. The preview is temporary and clearly labeled; the real account persistence checks were HTTP checks, not a manual signed-in browser walkthrough of every account screen.

The original 365 Daily Devotional deployment remains `fd83ae17-5f51-40cd-8144-cd081269ffd7`. Its code and services were not changed. No extra hosting service, storage bucket, paid provider or subscription was provisioned for Stage 4. Existing hosting usage still applies.

Stage 4 is complete within this scope. Stage 5 sales and commissions and Stage 7 launch remain pending.
