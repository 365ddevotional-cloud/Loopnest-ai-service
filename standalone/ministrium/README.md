# Ministrium

**Connecting churches. Equipping ministries.** Working name; name and domain availability are not confirmed. This app was previously called MinistryHarbor during the first development milestone.

## Development build 0.2

Ministrium is a standalone church and ministry platform extracted from Church Mode in `365ddevotional-cloud/Loopnest-ai-service`. The original source reference is `7e87b731e2a2820468d4af493b3e71a6a52180ae`. It has its own package, frontend, server, assets, authentication configuration and database schema. Copying this directory elsewhere does not require the devotional app to build or run it.

### Implemented

- Ministrium branding, landing page, and responsive sample workspace.
- Three-step church / ministry / combined-organization / private-group setup, including a clearly labeled demonstration when services are unconfigured.
- New private workspace API: create/list organizations, view a membership-scoped workspace, leader-only member lists and invitations, revoke an invitation, and accept an invitation with the intended verified email.
- Transactional organization + owner creation, unique addresses, and a five-organization pilot quota per creator.
- Random invitation tokens stored only as SHA-256 hashes, expiring in seven days, consumed atomically once. New invitations create members; they cannot assign administrators.
- Dedicated Firebase identity verification with required verified email; query cache and private invitation state are isolated on account/organization changes.
- Private community conversations, prayer requests and leader-managed gathering schedules, with a sample family group at `/group-preview`.
- Workspace teaching, private sermon study/bookmarks, announcements, events, departments, owner-managed leadership and membership audit. See `docs/stage3-ministry-tools.md`; sample at `/tools-preview`.
- Explicit, checksum-checked versioned migrations for the `ministrium` PostgreSQL namespace. No migration runs on server startup.
- PostgreSQL-backed tests through PGlite, HTTP API tests and a scoped GitHub Actions workflow.

### Staged or unavailable

The extracted 29 legacy church pages and 141 inherited route registrations remain in `source/` as migration reference. **None of the legacy handlers are registered in the runtime** until their features and tenant checks are migrated. Their database definitions are not applied. The runtime imports only the new Ministrium workspace service, not the devotional database/storage/startup.

Teaching, announcements, events and departments now use the separate workspace model through `/workspace/:id/tools`. Public church pages and remaining specialized legacy screens are still staged. The sample dashboard remains synthetic. There is no live product catalogue, checkout, order delivery, settlement, subscription, outbound email or file upload. Giving, inherited payout configuration and all live financial endpoints remain blocked. Native app-store packages and offline operation are not included.

## Private groups

Family prayer, prayer circles and discipleship groups have a distinct `group` workspace type with a required purpose (`family`, `prayer` or `discipleship`). They do not have to register as churches or ministries. Private workspaces include member conversations, prayer requests with author/leader answered status, and leader-scheduled gatherings. Meeting times display in each viewer’s time zone. Leaders may share an existing HTTPS meeting link; built-in voice/video and discipleship lessons are future integrations. Members can join from different locations; the base country does not restrict membership. Linking a group to a church/ministry is planned and not implemented.

## Run the preview

Use Node 22 or later, from this directory:

```sh
npm ci
npm run check
npm run build
npm test
npm start
```

The server defaults to port 8080. With no dedicated database, the landing page, sample dashboard and setup demonstration work; data APIs return 503. `/api/health` reports preview mode and disabled payments. Sample edits last for the current visit only.

## Enable a separate development workspace

No cloud service is created automatically and no production data is migrated. Set up a dedicated PostgreSQL database and Firebase project first. Do not reuse devotional services or copy their secrets.

1. Supply server variables from `.env.example`: `MINISTRIUM_DATABASE_URL`, `MINISTRIUM_DATABASE_CONFIRMED=standalone`, and `MINISTRIUM_FIREBASE_PROJECT_ID`.
2. The owner-supplied public web configuration for `ministrium-425f9` is built in through `config/firebase-web.mjs`. To use another project, supply all four matching `VITE_MINISTRIUM_FIREBASE_*` values at build time. Enable Firebase email/password authentication and authorize the deployed hostname. These scripts do not automatically load a `.env` file into the server or migration process; export variables or use the host's environment configuration.
3. Run `npm run migrate` explicitly against that dedicated database. It applies migrations 001, 002 and 003, each in its own transaction, creating only Ministrium tables and version records. Re-running is safe; changing an applied migration is rejected.
4. Build and start. The server verifies all installed migration checksums before enabling workspace APIs.
5. Test signup → email verification → create organization → invite → accept using the invited account. Automatic invitation email is not implemented: a leader privately shares the one-time-displayed link.

The runtime never falls back to `DATABASE_URL`, and never rewrites it. A matching inherited and dedicated URL is rejected. The confirmation variable is an operational guard, not proof of database ownership. The connection pool is limited to five connections. Database SSL must be configured according to the chosen provider; TLS verification is never disabled by the code.

## API and authorization

All new APIs require `Authorization: Bearer <verified Firebase ID token>` and return `Cache-Control: no-store`.

| Endpoint | Access |
|---|---|
| `GET /api/workspaces` | Only organizations belonging to the signed-in account |
| `POST /api/workspaces` | Verified account; server assigns ownership |
| `GET /api/workspaces/:id` | Member of that organization |
| `GET /api/workspaces/:id/members` | Organization owner/admin |
| `GET/POST /api/workspaces/:id/invitations` | Organization owner/admin |
| `DELETE /api/workspaces/:id/invitations/:invitationId` | Owner/admin of the same organization |
| `POST /api/workspaces/join` | Matching invited, verified email and valid unused token |
| `GET/POST /api/workspaces/:id/messages` | Workspace member |
| `GET/POST /api/workspaces/:id/prayers` | Workspace member |
| `PATCH /api/workspaces/:id/prayers/:prayerId` | Request author or workspace owner/admin |
| `GET /api/workspaces/:id/gatherings` | Workspace member |
| `POST /api/workspaces/:id/gatherings` | Workspace owner/admin |

Invitation links carry the token in a URL fragment, not the request path or query. Response headers disable referrer transmission. Never log or publish private invitation links. Token verification reads public Google signing certificates; no service-account private key is required. The process-local pilot limiter allows 60 authenticated workspace requests per minute per account. Use a shared rate limiter before running multiple replicas.

## Maintenance

`npm run extract` regenerates the legacy snapshot from the parent repository two directories above. It is not part of normal builds and must be used only while this folder resides inside that repository. It does not replace the new workspace database or handlers. Review generated changes before committing. Do not run the parent's `db:push` for this app.

## Next milestones

1. Expand account lifecycle and public ministry pages after the verified dedicated account foundation.
2. Extend the connected teaching, event, department and community tools with richer discipleship lessons and pastoral care workflows.
3. Implement authorized uploads and dedicated email delivery.
4. Build products, orders, protected resource delivery and an event ledger, then connected-account payments with transparent platform fees.
5. Validate refunds, disputes, receipts, fee reconciliation and country eligibility before opening real money collection.

This development branch does not modify or deploy the live 365 Daily Devotional service.

## Stage 2 deployment preparation

See `docs/staging-setup.md` for the deployment settings and live account verification sequence. `npm run check:staging` validates configured variable names, project matching and dedicated database separation without displaying credentials. The Dockerfile includes public Firebase build arguments and a minimal unprivileged production runtime. The dedicated identity/database are now provisioned and registration is live. Activation was explicitly approved by the owner; usage billing applies.

The dedicated Firebase project and web app have now been registered by the owner. Public configuration is integrated and the owner supplied screenshots confirming Email/Password is enabled. The dedicated database is connected and live account tests passed. See the verification record for coverage. Google OAuth and its domain setup remain outside the current email/password account scope.

## Expense authorization and live status

The earlier no-activation hold was superseded by explicit owner approval for the Ministrium app, dedicated PostgreSQL and volume to consume Railway credits or incur immediate usage charges. These resources are now live. Firebase upgrades, domain purchases, paid messaging and paid calling remain outside the authorized scope. See `docs/stage2-live-verification.md` for verified account tests and resource limits. No zero-cost hosting or fixed monthly bill is promised.

Community requests fetch recent 50 entries on load and manual refresh, without polling. Meeting links reuse services a leader already has. There is no automatic email, SMS, or paid call creation. The new functions are deployed and tested through the live HTTP API. Browser walkthrough coverage is recorded separately in the verification document.
