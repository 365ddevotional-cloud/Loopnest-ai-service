# Scripture selection and private feedback upgrade

## Scope

Existing application only. KJV stays the default, with existing WEB, ASV and DRB choices preserved. The shared selector and account preference apply to Bible, devotional readings and Sunday School reference readings. Embedded author quotations, teaching, copy/share lesson text and existing lesson audio remain original. Reference buttons identify canonical book/chapter/verse ranges; abbreviated or cross-chapter references may require opening the Bible reader. The reader's existing navigation/bookmarks remain unchanged.

Feedback lives on `/contact/feedback`; administration is in the existing Admin → Messages section. Existing feedback has no retroactive reply channel. Guest recovery uses a 256-bit random code, a SHA-256 digest on the server, and a one-year access lifetime. Codes are never put in URLs or browser storage. Guests must save the recovery code outside their browser; possession grants access. Signed-in threads use the existing verified Firebase identity. No guest push notifications are promised. Optional email responses use the existing mail provider and require explicit consent. Failed email delivery leaves the in-app reply intact and reports failure without automatically resending it.

Only the latest 100 account conversations / 200 administrator records appear in this initial interface. Administrators can filter those records, close conversations and permanently delete feedback and its replies. Users can revoke their reply channel. Expiry disables access, not automatic record deletion. No prayer/counseling routes or tables are modified.

## Text sources and permissions checked 2026-11-19

| Translation | Source and permission | Caching / redistribution |
| --- | --- | --- |
| WEB | eBible publisher identifies World English Bible as public domain, including commercial publication. https://www.ebible.org/eng-web/webfaq.htm | Public-domain text may be stored, copied and redistributed. Preserve accurate text; do not label modified text as WEB. |
| ASV 1901 | Publisher: https://www.ebible.org/find/details.php?id=eng-asv . getBible catalogue identifies public domain and eBible source. | Public-domain text permits storage and commercial redistribution. |
| KJV | Existing source retained. UK Crown rights are administered by Cambridge; public domain outside the UK does not remove that restriction. https://assets.cambridge.org/97805211/63347/copyright/9780521163347_copyright_info.pdf | Existing offline behavior retained, not expanded to a new full download. The getBible electronic edition also declares GPL and CrossWire source metadata. Do not treat that electronic edition as restriction-free; preserve upstream source/license notices. UK distribution permission remains a pre-release review item for existing availability. |
| DRB | Existing choice retained; no new text collection or availability expansion. | Existing source behavior retained. |

The existing chapter endpoint is `https://api.getbible.net/v2/{code}/{book}/{chapter}.json`. Reviewed provider catalogue: https://github.com/getbible/v2/blob/master/translations.json ; WEB points to `http://ebible.org/web/` (public domain); ASV to `http://www.ebible.org/bible/asv/` (public domain); KJV to `https://gitlab.com/crosswire-bible-society/kjv` (GPL). No text rewriting is introduced.

Only recently viewed WEB/ASV chapters are persisted locally (one per translation) plus a bounded in-memory chapter cache and concurrent request deduplication. No full new translation download is introduced. Exact live chapter payload checks were blocked by HTTP 403 from the development environment; mocked chapter tests do not prove production source availability or full-corpus accuracy. This must be checked in the deployed staging reader against publisher texts before release. Source-provider failure yields an explicitly labeled KJV fallback where available.

NKJV, NIV, NLT and ESV remain unavailable pending appropriate publisher permissions and commercial/caching terms. No new paid API, license or recurring service was activated.

## Database and rollout

Additive schema is exported as `conversationDDL` in `server/feedback-conversations.ts`: `bible_preferences`, `feedback_conversations`, `feedback_conversation_replies`, plus an identity lookup index. Existing feedback records remain unchanged. Migration uses a transaction, short lock timeout and statement timeout. It is idempotent. Production startup currently requires successful schema preparation; validate database privileges and migration on staging first.

Tests use a disposable PGlite PostgreSQL instance and injected authentication/mail adapters, not production accounts or real email. Integration cases cover guest recovery, hashed credentials, invalid tokens, cross-account denial, signed-in inbox/unread state, optional replies, email consent and delivery failure, expiry/revocation, closure, administrator authorization, deletion, preference isolation, and preservation of legacy records. These are not a completed manual browser or real-email staging journey.

Before merging: run `npm run check`, `npm run test:scripture-feedback`, existing suites and production build; manually exercise guest recovery in a fresh browser and Firebase account switching in staging; check Scripture source accuracy/availability; validate administrator session behavior and email delivery. Obtain the owner's required approval for production rollout of the private-message/database change after staging evidence is available. No unrelated PRs should be merged.

Rollback: revert application commit; retain additive tables to preserve conversations. Do not drop data during rollback. Existing prayer/counseling access rules are unchanged and their manual regression checks remain part of staging.
