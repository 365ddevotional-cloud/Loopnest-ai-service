# Church and Ministry standalone extraction audit
Date: 2026-10-29. Status: source audit and implementation specification; no standalone application or production change yet.

## Verified source
Railway project welcoming-harmony, service 365 Daily Devotional, production, custom domain 365dailydevotional.com points to 365ddevotional-cloud/Loopnest-ai-service, branch main.
Inspected commit: 7e87b731e2a2820468d4af493b3e71a6a52180ae.
Other devotional-named repositories do not contain this Church Mode implementation.
The user-account sign-in attempt returned Incorrect email or password. No authenticated UI verification was achieved. Findings below are code inspection, not successful transaction or role-isolation tests.

## Existing implementation to preserve
React/Vite frontend, Express backend, PostgreSQL/Drizzle; church APIs use Firebase UID/token helpers. Inspect current UserContext and token verifier before extraction; architecture notes may lag newer authentication changes.
ChurchModeShell and ChurchPublicShell provide organization-specific branding and navigation.
Pages: ChurchLanding, ChurchCreate, ChurchJoin, ChurchHome, ChurchDashboard, ChurchAdminPage, ChurchMembers, member profiles, ChurchSermons, ChurchAnnouncements, ChurchGroups, ChurchPrayer, ChurchMessaging, ChurchGiving, ChurchDepartments, ChurchDepartmentView, pastor notes/dashboard, policy pages, public home/about/watch/events/ministries/give/contact/join/visit.
Roles include owner, lead pastor, administrator, associate pastor, ministry leader, group leader, counselor, prayer team and member.
Existing functionality includes invitations, approval, branding, sermon attachments/bookmarks/notes, confidential prayer handling, departments and subdepartments, tasks/events/attendance, giving reports and CSV exports, global organization oversight and audit records.
Historical valid BDCC organization ID 3 must not be deleted or merged into suspended duplicate ID 2. Verify live records during a separately planned migration.
No complete church-specific storefront, product ordering, fulfillment and recurring billing implementation was found in the inspected church pages/schema/checkout paths. Standalone commerce needs new development.

## Existing monetization, with source locations
server/routes.ts:5437 church giving config returns global platform_fee_percent, default 2.5.
server/routes.ts:5540 create-session stores gross, platform fee, estimated processor fee, church net and pending payout. Uses Stripe Checkout mode payment (one-time), not subscription.
client/src/pages/ChurchGiving.tsx:567 explicitly states automatic church splitting requires Stripe Connect and current reconciliation is manual.
shared/schema.ts:1119-1206 defines giving settings/categories/payout configs/transactions/global fee settings.
server/routes.ts:6125 onward permits global platform fee management.
This is commission bookkeeping, not verified automatic collection and connected-account settlement. The checkout does not set a destination connected account or application fee.
The code's processor fee is an estimate of 2.9% plus 30 minor units, not an authoritative reconciled fee or universally valid country/currency rate.

## Payment blockers before launch
1. server/routes.ts:5620 giving webhook accepts req.body as an event when the signing secret OR signature is missing. Reject all unsigned/unconfigured events; never fallback to trusting request JSON.
2. constructEvent receives req.body although server/index.ts stores raw request bytes in req.rawBody. Use the original bytes for signature verification.
3. Enforce paid status, expected amount/currency, organization and account correspondence; handle async outcomes, duplicate and reordered events idempotently, refunds/disputes and reconciled fees.
4. create-session must enforce fee acceptance, organization approval, verified and payment-enabled connected account and active category belonging to that organization.
5. Derive donor UID from verified authentication, not donorFirebaseUid submitted by the client.
6. Confirmation lookup must be scoped to organization and authorized donor; current public reference lookup returns a full transaction and ignores slug correspondence.
7. Payout-config update passes req.body to upsert. Inspect and restrict writable fields; organizations must not self-assign verification or authorization status. Prefer processor-hosted onboarding over retaining bank account details.
8. Validate money as bounded integer minor units using currency-specific precision. Snapshot pricing versions per order; do not print old receipts with today's fee percentage.
9. Use a configured trusted application origin for return URLs.
10. Add automated tests for cross-organization access and all payment failure/replay paths. These are material launch requirements, not evidence of exploitation.

## Proposed commercial model (recommendations, not deployed pricing)
Start with free basic church/ministry accounts and transparent transaction fees:
- Giving: proposed 1% platform service fee plus actual processor costs; review unit economics and local eligibility before activation.
- Product/course sales: proposed 5% platform fee plus processor costs.
- Paid events: proposed 3% platform fee plus processor costs.
- Optional Pro: proposed USD 15/month for advanced administration, multiple campuses, expanded reports, custom domain and lower transaction rates; local pricing later.
Do not require Pro for prayer, salvation teaching, ordinary pastoral care or basic Bible access. Never promise blessings in exchange for fees or donations.
A purely transaction-funded model cannot finance unlimited non-paying organizations, video storage, SMS or AI. Set transparent storage/usage limits; paid SMS/media extras must be opt-in and usage-bounded.
Illustration only: 50 churches each processing USD 2,000/month yields USD 1,000 monthly platform revenue at 1%, before operating costs, refunds, taxes and payment-platform costs. This is not profit or a forecast.

## Legitimate ways to retain transaction revenue
Server-owned prices and automatic fee collection for every in-platform order. Fulfillment, receipts, tickets, access and reporting require verified processor events. Never trust a checkout success redirect as proof of payment.
Provide public church storefronts, QR checkout, donor receipts/history, secure downloads, event check-in, recurring giving and useful reconciliation to make the platform worth staying on.
Prohibit fee avoidance for platform-originated commercial orders through clear terms and checkout rules; handle exceptions transparently.
No app can prevent cash offerings, independent bank transfers or unrelated outside sales. Do not claim universal capture, scan private pastoral messages to police payments, or obstruct legitimate data export. Optional subscriptions diversify revenue when transactions move elsewhere.
Free users can have capped basic services without being forced to route every financial activity through the app.

## Extraction implementation order
1. Create independent source package/app, separate database and secrets, initially local/staging. Keep 365 deployed unchanged. Use a temporary working name pending branding.
2. Extract church schema/storage/routes with explicit dependencies; do not copy the entire monolithic server/routes.ts or expose music/AI/admin APIs accidentally.
3. Extract organization shells, church/public routes, shared UI, localization, login/token verification and uploads. Replace hardcoded devotional URLs and app identifiers.
4. Enforce tenant-scoped queries for every organization resource, private counseling, messages, member exports and payment record.
5. Implement org onboarding and processor-hosted verification, trusted account mapping, automatic fees, webhook event ledger and balance reconciliation.
6. Add product catalog, inventory or digital assets, orders, refund workflow, signed download entitlements and event ticketing. Then add optional subscriptions.
7. Pilot with synthetic data and one or two authorized churches before moving any live members or money. Preserve IDs or document old-to-new mapping and access consent.
8. Release responsive installable web app first to control initial cost. Evaluate Android/iOS purchase and donation rules before native billing; no unsupported global payout promises.
9. Release only after role isolation, purchase/refund/replay tests, private content checks, backup/restore and end-to-end settlement verification pass.

## Sources
- https://docs.stripe.com/connect/destination-charges (automatic transfer/fee model; fee liability depends on chosen charge pattern)
- https://docs.stripe.com/connect/connect-cross-border-payouts (country and funds-flow limits)
- https://get.tithe.ly/pricing (free giving and optional paid church products)
Processor account approval, fees, donation eligibility and native-store policy require verification for launch countries. Do not treat one country's setup as worldwide support.
