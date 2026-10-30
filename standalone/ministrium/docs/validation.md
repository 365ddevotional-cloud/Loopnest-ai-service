# Ministrium validation — 2026-10-29

## Build 0.2

The app is renamed from MinistryHarbor to Ministrium, including its directory, package, manifest, configuration names, runtime responses, UI and extracted branding. The historical Git branch name is retained to keep the existing review intact.

- Strict TypeScript checking and production builds pass.
- Tests execute the real SQL migration and workspace service in PGlite (embedded PostgreSQL), plus HTTP routes. They cover migration repeatability/checksums, ownership creation, tenant isolation, forged client roles/identities, unique addresses, invitation hash storage, email binding, replay, expiry, revocation, simultaneous acceptance, existing-owner preservation pilot quotas, and isolated family/prayer/discipleship group creation.
- Runtime preview tests use a deliberately invalid inherited `DATABASE_URL` to prove the preview never connects to it. Live payment operations remain blocked.
- Browser verification covers Ministrium branding, the setup demonstration, its review and completion views, sample workspace navigation and unavailable live-registration messaging.
- Responsive breakpoints are implemented. Device-specific layouts, live Firebase email flows and deployment against a hosted PostgreSQL provider are not yet verified.

All preview metrics and people are synthetic. Setup demonstrations and sample edits are in-memory only. No production deployment, data migration, financial transaction, outgoing invitation or live devotional modification was performed.

## Stage 2 preparation

- 19 tests pass, adding real RSA-signature verification tests and deployment configuration checks.
- Staging readiness currently reports missing dedicated identity/database settings; no live account setup is claimed complete.
- GitHub's previous 13-test build completed successfully. Updated CI will run on the next development commit.
- The Dockerfile is prepared but has not been built here because Docker is unavailable.
- Registration is gated on both complete frontend identity settings and a ready backend.

## Registered Firebase web configuration

The owner supplied the public web configuration for project `ministrium-425f9`. The frontend now resolves that configuration by default; alternate projects require a complete four-variable override. Backend readiness still controls account access. Hosted authentication provider settings and dedicated database connection are not verified yet.

## Community milestone — expense hold

TypeScript and production build pass. Embedded PostgreSQL tests now exercise both migration versions, membership-only conversations, token-bound author identity, prayer author/leader permissions, cross-workspace isolation, scheduling permissions, time-zone validation and safe HTTPS meeting links. HTTP tests verify membership and verified identity at the new conversation boundary.

The owner has prohibited further expenses. No Railway activation, Firebase upgrade, domain purchase, paid messaging or meeting service was performed. Live multi-user persistence still requires hosting; this milestone is code and local preview only.

All 24 tests pass. Browser checks verified posting a sample conversation, posting a prayer request, marking a request answered, and scheduling a gathering. The verified prayer view is saved as `group-preview.jpg`. Sample edits are temporary and were not sent to real members.

## Stage 2 activation

The owner approved immediate hosting usage and applied the Railway patch. App and PostgreSQL deployments succeeded, both migrations applied, and live registration/email verification/fresh sign-in, membership privacy, email-bound invitation acceptance/replay rejection/revocation, community writes and persistence checks passed. See `stage2-live-verification.md` for exact coverage and browser limits.

## Stage 3 — connected ministry tools

All 32 tests, TypeScript and production build pass. Browser sample checks verify teaching creation, recoverable archive, notes/bookmark editor, event creation, draft announcements, department membership and leadership review. See `stage3-ministry-tools.md` for API coverage, source adaptation and remaining scope. Live activation is recorded separately after success.

Stage 3 deployment reached SUCCESS (`7c8f7eab-e0e7-4090-b0b8-a58018bb9393`); migration 3 applied. Live verified-account HTTP checks passed for the four content types, drafts, study privacy, versioned editing, archive/restore, teams, owner-only role management, audit and removal. The deployed sample page also rendered correctly. See `stage3-ministry-tools.md` for precise coverage.

## Stage 4 — private group study and gatherings

TypeScript, production build and all 40 tests pass. Browser sample checks cover lessons, personal completion/reflection save, archive/restore, meeting edits/cancellation/restore and Chicago/Lagos viewing. See `stage4-private-groups.md` and `roadmap.md` for scope and the remaining stages. Live activation is recorded after success.
