# Stage 6 — platform administration and broader testing

Stage 6 adds a privacy-limited platform owner console to Ministrium. It does not change the 365 Daily Devotional app. No new Railway service, database, volume, payment account or paid add-on was provisioned.

## Owner access

- `MINISTRIUM_PLATFORM_OWNER_EMAIL` is the bootstrap email, set only on the Ministrium server.
- After Firebase verifies that email, its first successful access binds the sole platform-owner record permanently to that Firebase UID. Changing the environment value does not transfer ownership. The feature has no public role-grant endpoint or client-supplied admin claims.
- Church/ministry owner and administrator roles remain organization-scoped and do not grant platform-wide access.
- `/admin-preview` uses synthetic data and local-only sample actions. `/admin` requires verified account access; `/reports` shows only the current account's submitted reports.

## Review and enforcement

- Reports are created from a specific member-visible message, prayer request, published lesson/resource, or listed product. The reporter must enter a reason and explicitly consent to share the selected item. Text is capped at 4,500 characters. Product reports include its public description, never purchased content.
- Platform staff see only that report excerpt, the reason, workspace identity and administrative status. Member reflections/progress are not report targets and are not queried for report display. Report responses and private APIs use `Cache-Control: no-store`.
- Open report duplication is idempotent; submission has a bounded per-account quota. Report resolution and workspace status updates use versions, record a reason in the audit trail, and can be corrected/restored without hard-deleting records.
- Suspension pauses new community, study, invitation, catalogue-listing and checkout activity. Existing buyer order records, downloads where already entitled, and refund/support reconciliation paths stay available. This is an app-level control; it does not revoke an already issued third-party checkout URL.

## Verification

Local verification on 2026-10-30:

- `npm run check` — passed.
- `npm run build` — passed.
- `npm test` — 59 passed, 0 failed.
- New service and HTTP tests cover first-owner binding, account verification, spoofed claims, cross-workspace report IDs, explicit report consent, report privacy, group lesson personal-reflection exclusion, report ownership, suspension/restoration versions, retained existing content and disabled payments.
- Existing Stage 2–5 tests still pass, including authentication, tenant scoping, commerce idempotency, disabled payment behavior, refunds and webhook signatures.

The configured owner still needs to sign in normally with the verified owner email to establish the live UID binding and view the live owner console. No credentials were requested or embedded in the app. This document does not claim that manual owner-console verification has occurred.

## Remaining stages

Stage 5 still requires a dedicated Stripe test configuration, review/approval of the commission model and real sandbox checkout, refund, dispute and commission reconciliation. Live-money processing is not enabled. Stage 7 pilot, legal/product review and app-store distribution are not complete.

## Production deployment — 2026-10-30

Stage 6 source `a8b1906d61fc9ad332b5f8f0a25646fcf412e0fe` reached Railway SUCCESS in deployment `b76040fa-06b1-4ed8-9d89-49bf7f5ebc13`. Migration 6 was applied on the initial Stage 6 rollout; the follow-up font-selector deployment also reached SUCCESS. Live checks returned HTTP 200 for `/api/health` and `/admin-preview`, and HTTP 401 for `/api/platform-admin/access` without a verified account. Health reports workspace mode and `paymentsEnabled:false`. The original devotional remains on deployment `fd83ae17-5f51-40cd-8144-cd081269ffd7`.

The configured owner must still sign in with the verified owner email to bind the owner record to the Firebase UID. No owner credentials were used during deployment.
