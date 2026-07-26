---
name: Church Mode Pastor Dashboard
description: Two dashboard pages for church admin leaders — Phase 1 dashboard and sermon notes CRUD; stats endpoint structure and SQL patterns.
---

## Two Dashboard Pages

### ChurchDashboard.tsx — `/church/:slug/dashboard`
Phase 1 implementation. Accessible to CHURCH_ADMIN_ROLES (owner, lead_pastor, administrator, associate_pastor).
- Header with org logo/initials, name, denomination, current date, "View Member Page" button, branding color
- 8 summary cards: Members, Prayer, Announcements, Events, Departments, Tasks, Sunday School, Compliance
- Quick Actions: 8 buttons (Create Announcement, Add Event, Invite Members, Create Department, etc.)
- This Week: next event, latest announcement, latest SS lesson, pending members, active prayers
- Recent Activity: UNION of member joins + announcements + published pastor notes (last 10)
- Compliance alert banner when complianceNotices > 0
- i18n: full EN/ES/FR with cm_ keys

### PastorDashboard.tsx — `/church/:slug/pastor-dashboard`
Sermon notes CRUD for authorized leaders. Also shows a summary stats header.
- Create/edit/publish/archive church_pastor_notes
- Members view at /church/:slug/pastor-notes (ChurchPastorNotes.tsx)

## Server: ChurchDashboardStats Interface (server/storage.ts)
Fields: activeMembers, pendingMembers, upcomingEvents, unreadMessages, activePrayers,
announcements, openTasks, publishedNotes, activeDepartments, sundaySchoolLessons,
complianceNotices, nextEvent, latestAnnouncement, latestLesson, pendingMembersList,
activePrayersList, recentActivity.

**Why:** SQL returns snake_case keys (start_date not startDate). ChurchDashboard.tsx uses snake_case field access (stats.nextEvent?.start_date). PastorDashboard.tsx incorrectly uses camelCase (pre-existing bug, do not fix unless asked).

## Recent Activity SQL Pattern
UNION of three sources with ORDER BY created_at DESC LIMIT 10:
1. church_members WHERE status='active' AND joined_at IS NOT NULL → type='member_joined'
2. church_announcements → type='announcement'
3. church_pastor_notes WHERE status='published' AND published_at IS NOT NULL → type='note_published'

## Nav in ChurchModeShell
- "Dashboard" (cm_dashboard) → /church/:slug/dashboard for isAdmin roles only
- "Sermon Notes" (cm_sermonNotes) → /church/:slug/pastor-notes for all members

## DB Table
church_pastor_notes — created via raw SQL (not drizzle-kit push). Schema in shared/schema.ts as churchPastorNotes.
