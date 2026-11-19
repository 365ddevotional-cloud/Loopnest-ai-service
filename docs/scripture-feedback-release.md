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


## Staging evidence — 2026-11-19

Authorized temporary project: `f75afc97-ed2a-43e2-af70-f34643b26e26`, environment `staging` (`f3800074-d6f5-449c-87e6-e669dcd82a0b`), web service `42a2aac8-106a-4763-9b2e-536545095b7b`. Independent new PostgreSQL database; no production database URL, customer records, payment credentials, email-provider credentials or narration credentials copied. Narration is explicitly disabled. App sleep is enabled; web resource limit is 1 GB/1 CPU and database 0.5 GB/1 CPU. These are resource ceilings, not a billing cap. Temporary resources require cleanup after review.

Deployment `2c8acf18-9117-4a79-a697-db906323f3e9` reached SUCCESS at commit `e969037`. Fresh-schema Drizzle initialization and the additive conversation migration both completed. Deployed HTTP checks passed for real administrator session creation/logout, guest opt-in, administrator reply, guest recovery using a fresh session, invalid credentials, unauthorized administration, follow-up and revoked access. Two synthetic Firebase identities verified real provider JWT validation, account-isolated preferences across HTTP sessions, cross-account conversation denial, unread reply state and revocation; both temporary identities were deleted afterward. No real subscriber identity was selected or modified.

Browser checks passed for feedback submission and recovery after reload, retrieval of a ministry reply, Sunday School main reading John 3:16, memory verse Romans 8:1, and supporting range Ephesians 2:8–10 in WEB, then the supporting range in ASV. The original KJV quotation and teaching stayed unchanged. The existing production Bible reader also loaded WEB and ASV Genesis 1 successfully; the earlier workspace-only HTTP 403 does not describe browser source availability. These sampled checks do not constitute a full-corpus textual audit.

Staging uncovered and corrected two client issues: the open-replies button must invalidate the thread query when pressed again, and an unavailable-translation warning must not appear while a passage is still loading. A follow-up staging deployment is needed to verify those exact corrections. Email consent/error handling is covered by injected integration tests; actual mail delivery was deliberately not exercised without staging mail credentials. Browser account-sign-in itself was not manually repeated; real Firebase JWT/API ownership journeys were tested.

Legacy prayer-access routes were inspected, not altered: some still use an email address as the access credential. This is a pre-existing privacy weakness, so this change cannot certify those older routes as secure. It needs a separately reviewed migration of existing conversation access; do not expand access or merge unrelated draft PR #18 automatically.
