# MinistryHarbor

A home for your ministry. Working name; domain and trademark availability are not confirmed.

## Foundation build 0.1

This is an independent app extracted from Church Mode in `365ddevotional-cloud/Loopnest-ai-service`, source commit `7e87b731e2a2820468d4af493b3e71a6a52180ae`. It has its own package, frontend entry point, server, copied source snapshot, assets, identity configuration and database configuration. It does not need the devotional app at runtime or to build from this directory.

The first development milestone includes:

- A responsive MinistryHarbor homepage and interactive sample workspace.
- A separately built set of 29 existing church pages and 141 extracted route registrations. Route registrations include inherited finance/admin handlers that are deliberately blocked by the server policy; these counts do not mean every feature is launch-ready.
- Existing church registration, invitations, membership, sermons, announcements, departments, prayer, profiles, messaging and dashboards, pending dedicated database/schema and identity setup plus functional verification.
- Independent Firebase configuration with no inherited devotional credentials; verified email required by the token verifier.
- A fail-closed boundary around live payment, payout-account and global administration endpoints.
- No devotional/music/game server startup, content seeding or background schedulers.
- A standalone app manifest and original MinistryHarbor icon. Native app-store packages and offline support are not included yet.

`/preview` uses entirely synthetic data. Adding or approving a sample person changes only React state for the current visit. No messages are sent, no accounts are collected in unconfigured preview mode, and no payment or product order can be placed.

## Run

Use Node 22 or later. From this directory:

```sh
npm ci
npm run check
npm run build
npm test
npm start
```

The server defaults to port 8080. With no dedicated database configured, the landing page and sample workspace run while data APIs return a clear 503 response. The health endpoint is `/api/health`.

## Isolation

This app never falls back to the parent `DATABASE_URL`. It requires both `MINISTRYHARBOR_DATABASE_URL` and `MINISTRYHARBOR_DATABASE_CONFIRMED=standalone`, plus `MH_FIREBASE_PROJECT_ID`, before loading any database code. Do not point it at a live devotional database. Do not copy production environment variables wholesale.

Use `.env.example` as the configuration inventory. The frontend uses `VITE_MH_FIREBASE_*` settings, supplied at build time. Configure a dedicated Firebase project and matching server project ID. Production rate limiting, dedicated email delivery, authorized upload storage, complete tenant checks and database migrations remain launch requirements. The explicit database confirmation is an operational guard, not an independent verification of database ownership.

The copied `source/shared/schema.ts` and `source/server/storage.ts` currently include legacy shared definitions and methods. Only church routes are registered. **Do not run the parent `db:push` or deploy its entire shared schema**. A church-only migration with required shared dependencies is the next backend milestone. No migration runs automatically.

The source snapshot is committed to make builds reproducible. `npm run extract` is a maintenance command that regenerates it from the original repository two directories above; it is not part of the standalone build. Review all regenerated changes before committing. It may be used only while this folder resides in the original repository. Ordinary builds work after copying this folder elsewhere.

## Payments and commerce

The inherited giving flow is not safe for launch as-is. In this build, checkout creation, payment confirmation, webhook processing, payout settings and enabling giving are blocked before inherited handlers execute. Payment credentials are unnecessary. Outbound email is also disabled rather than sending devotional-branded mail.

The resource shop and giving figures in `/preview` are labeled sample/design previews. Product catalogue persistence, orders, protected delivery, verified connected-account payments, refunds, tickets, subscriptions and settlement reconciliation are not implemented. Proposed prices in the prior audit are not active charges.

## Next implementation milestones

1. Extract the minimum church database schema/migration and complete tenant/role checks; set up a separate staging database and identity project.
2. Verify registration → email verification → church creation → invitations → member approval end to end.
3. Add dedicated email and upload integrations, including limits and private-content authorization.
4. Build product/order/entitlement records and a payment event ledger; implement automatic fees through approved connected-account processors.
5. Add payment, refund, dispute and isolation tests before opening real money collection.
6. Pilot with authorized churches, then evaluate native distribution and launch-country eligibility.

The live 365 Daily Devotional service is not changed by these files. Keep development on the feature branch until validation is complete.
