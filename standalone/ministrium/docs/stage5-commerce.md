# Stage 5 — digital resource sales

## Delivery and activation status

The code supports digital text resources, a seller catalogue, buyer purchase library, server-priced Stripe hosted Checkout, commission snapshots, signed webhooks, refunds, disputes and reconciliation. It uses Ministrium’s existing database and hosting. Basic private groups stay free. No subscription, new bucket, email provider or other paid service is provisioned.

**Stage 5 is not fully activated.** The connected Stripe session exposes only the live “365 Daily Devotional” account. No separate Stripe sandbox runtime key or Connect webhook signing secret has been configured for Ministrium. Provider behavior has been tested with local contract fixtures and Stripe’s signature verifier; this is not a real Stripe sandbox checkout or payout test. Real-money processing is deliberately unsupported by this build. The 5% rate shown in the demonstration is a proposal, not an approved live fee.

## Seller and buyer experience

Church/ministry owners or administrators can prepare up to 100 products at `/workspace/:id/shop`, edit with version checks and archive/restore. The buyer view at `/shop/:id` requires a verified account but not church membership. Only listed, unarchived metadata is exposed; paid content never appears in the catalogue. Family/prayer/discipleship group workspaces cannot become sellers in this release.

The pilot supports USD text downloads priced $1–$1,000, with up to 100,000 characters per resource and 200 lifetime orders per buyer. PDF/audio/video uploads, physical shipping, multi-seller carts, donations, subscriptions and additional currencies are future extensions, not silently simulated features. The temporary `/commerce-preview` demonstrates authoring, commission examples and a simulated order/refund without contacting Stripe.

Paid content is snapshotted into each order. Later editing, archiving or a membership change does not replace the purchased edition. An authenticated buyer retrieves only their own paid resource and downloads it as a text file. Paid access is server-controlled, not based on the browser return URL, editable price, role or request metadata. When sandbox payments are configured, each download also rechecks authoritative payment state. Refunded, partially refunded and disputed orders are denied access. A downloaded file cannot subsequently be recalled, and recipients may copy it; no system can guarantee commission on sales made outside the app.

## Proposed payment configuration — requires approval before activation

- Each church/ministry remains the business the buyer pays, with a full Stripe Dashboard, direct charges, Stripe billing payment-processing fees to that seller and Stripe handling connected-account negative balance liability under the supported configuration. Ministrium still handles its own account liabilities and applicable obligations.
- Platform application commission is calculated on the server in integer cents and retained by Stripe on app-created purchases. Proposed starting rate: 5%. Processing fees are separate and seller net is not guaranteed. No giving commission or subscription is introduced here.
- Owner-only onboarding explicitly accepts the configured sandbox commission and current pilot terms. Hosted onboarding collects seller financial/identity information; Ministrium does not collect bank numbers or cards. Returning from onboarding does not imply readiness; each checkout rechecks v2 card capability, responsibility settings, test mode and account/org binding.
- Recommend the Stripe notification banner and account-management embedded components in the later operational dashboard; this pilot currently uses hosted onboarding and the seller’s full Stripe Dashboard.

The rate and payment responsibility model remain reviewable proposals. Existing donor code’s 2.5% default and estimated provider fees are not reused as sales terms. Taxes are not enabled or advertised as collected. Tax registration/configuration, supported seller countries, seller/buyer policies, refunds and app-store billing review are required before public sales.

## Reliability and authorization

Migration `005_commerce.sql` adds dedicated sellers, products, orders and deduplicated commerce events. Foreign keys/indexes enforce organization, product and buyer scope. Current membership/role checks use the organization lock, consistent with earlier stages. Buyer records exist independently of memberships.

Checkout request keys and provider idempotency keys prevent retries creating another payment. The buyer lock reuses pending/paid orders for the same product even after a page reload. Pending purchases also have a partial unique index. Server snapshots fix price, commission, currency, title and delivered content. Provider calls use a stable integration identifier across retries/deployments.

The webhook handler receives the raw body before JSON parsing and verifies the Stripe signature. Invalid signatures fail 400; processing failures return 500 for Stripe retries. Only sandbox events are accepted. Account/order matching, session totals, currency, payment intent, successful charge and application commission are verified against current provider state. Webhook event payloads are triggers, not trusted fulfillment state. Each order’s reconciliation locks serialize provider refreshes; duplicate events do not duplicate updates. Refund totals are monotonic and unpaid snapshots cannot revoke a verified paid order.

Handle Checkout completion/async success/failure/expiry, charge refunds/disputes, refund updates and application-fee refunds. Account status is refreshed during setup/readiness and before checkout. The owner may submit a full sandbox refund with a stable provider idempotency key and request application-fee refund. Partial external refunds require seller Dashboard review. The seller can reconcile an order manually; buyers can check their own status. Background repair scheduling is not provisioned.

Reconciliation records gross amount, actual refunded amount, original commission, refunded commission, Stripe’s charge balance transaction fee/net and dispute status. Stripe’s reported total fee can include application commission; do not subtract commission twice. Balance transaction figures are the original charge transaction, not a bank payout or complete seller settlement ledger. The UI displays the most recent 100 orders. Automatic payouts, payout proof and aggregate tax reports are not claimed.

## Secure sandbox setup still required

Do not place keys in GitHub or chat. Configure a dedicated restricted sandbox key using the deployment platform’s secure variable entry:

- `MINISTRIUM_COMMERCE_MODE=sandbox`
- `MINISTRIUM_STRIPE_TEST_KEY` — dedicated `rk_test_` key (or test secret only when restricted permissions cannot cover the required API).
- `MINISTRIUM_STRIPE_WEBHOOK_SECRET` — signing secret from a dedicated connected-account snapshot webhook at `/api/commerce/stripe-webhook`; subscribe to the event families listed above, including platform application-fee events as appropriate.
- `MINISTRIUM_COMMERCE_FEE_BPS` — explicitly approved rate; 500 represents proposed 5%.
- `MINISTRIUM_PUBLIC_ORIGIN=https://ministrium-production.up.railway.app`

The code never inherits `STRIPE_SECRET_KEY` from the devotional and rejects live commerce mode/keys. SDK 23.0.0 uses Accounts v2 and Checkout Sessions with dynamic payment methods. Source extraction drops the obsolete card allowlist in the staged legacy route for SDK compatibility; legacy financial endpoints stay blocked. The original devotional source is unchanged.

Complete a real sandbox seller onboarding, paid/declined/delayed checkout, signed Connect webhook, refund, dispute and commission reconciliation before marking Stage 5 complete. Approval of the rate/model and secure runtime credentials remain outstanding. Stage 6 and Stage 7 remain pending.

## Verification

TypeScript, production build and all 54 automated tests pass before deployment. Tests cover strict input/role/scope checks, private content, price/commission spoofing, repeat checkout keys, inactive seller capability, payment mismatches, raw signature verification, webhook replays, refund/dispute access and version/archive behavior. Local sample browser checks cover creation, pricing, archive/restore and simulated sale/refund. Live non-payment checks and deployment IDs are appended after successful activation of this code, without treating those as payment verification.


## Deployed code and live non-payment checks — 2026-10-30

Source `21eb9802678dc3ad1540d7db898e0394ae1e475e` reached Railway SUCCESS in deployment `7e98ca48-a144-4420-b7c9-6c342f77bd17`. Migrations 1–4 were already current; migration 5 applied. Runtime remains workspace mode with live payments disabled.

All 54 automated tests pass, with TypeScript and production build successful. Two synthetic Firebase accounts were verified from actual received messages. They passed 28 live API checks covering catalogue persistence after fresh sign-in, hidden paid content/drafts, nonmember browsing, leader/member/cross-workspace authorization, free group exclusions, edit versions, archive/restore and disabled checkout/onboarding/webhook safeguards. No payment or commission was processed. A manual signed-in browser walkthrough of all account screens is not claimed.

Local browser checks covered creating/pricing an original sample resource, archiving/restoring it, simulated sale/refund and an actual sample text download (content verified). The deployed `/commerce-preview` loaded and its explicitly simulated order state was checked. Screenshot: `stage5-live-shop.jpg`. These sample checks are not real Stripe checkout verification.

The original devotional deployment remains `fd83ae17-5f51-40cd-8144-cd081269ffd7`. No services, volumes, buckets, subscriptions or financial accounts were provisioned. Existing Ministrium hosting usage continues. Stage 5 remains awaiting secure sandbox setup, confirmed fee/model and real provider payment/refund/commission tests.
