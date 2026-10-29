# Ministrium validation — 2026-10-29

## Build 0.2

The app is renamed from MinistryHarbor to Ministrium, including its directory, package, manifest, configuration names, runtime responses, UI and extracted branding. The historical Git branch name is retained to keep the existing review intact.

- Strict TypeScript checking and production builds pass.
- Tests execute the real SQL migration and workspace service in PGlite (embedded PostgreSQL), plus HTTP routes. They cover migration repeatability/checksums, ownership creation, tenant isolation, forged client roles/identities, unique addresses, invitation hash storage, email binding, replay, expiry, revocation, simultaneous acceptance, existing-owner preservation pilot quotas, and isolated family/prayer/discipleship group creation.
- Runtime preview tests use a deliberately invalid inherited `DATABASE_URL` to prove the preview never connects to it. Live payment operations remain blocked.
- Browser verification covers Ministrium branding, the setup demonstration, its review and completion views, sample workspace navigation and unavailable live-registration messaging.
- Responsive breakpoints are implemented. Device-specific layouts, live Firebase email flows and deployment against a hosted PostgreSQL provider are not yet verified.

All preview metrics and people are synthetic. Setup demonstrations and sample edits are in-memory only. No production deployment, data migration, financial transaction, outgoing invitation or live devotional modification was performed.
