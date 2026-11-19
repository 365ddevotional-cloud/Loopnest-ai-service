# Stage 3: first content translation batch

## Prepared pilot

The November 19, 2026 production devotional, **Glorious Light** (ID 318), was retrieved in English and checked through all six reader language options. No saved non-English version was returned at the time of preparation. The exact public English source is recorded with a SHA-256 hash. This is the actual production text, not the earlier seed version.

Five assistant-prepared drafts cover Spanish, French, Yoruba, Nigerian Pidgin and Hausa. Each contains a title, four paragraphs, seven prayer points, four faith declarations, the attributed quotation and the prophetic declaration. Scripture text and the original author field remain unchanged. Translated titles and teaching are draft content, not official Bible translations.

No external translation-provider request, new subscription, new service, database migration or narration generation is included. Normal existing hosting costs still apply. Public devotional requests retain the saved-only policy and zero new generation allowance. Previously saved translations elsewhere in the devotional archive are unchanged; this pilot is not a full archive translation or audit.

## Private review

Open the existing administrator dashboard and select **Content translations**. Select a draft language to compare it with the English source. The view remains read-only, offers no publication button, and requires the existing server-side platform-admin session. The endpoint is `GET /api/admin/content-translations`, with `Cache-Control: no-store`. Draft text is imported only by the server; it must not appear in public client assets or public reader responses.

Every draft is explicitly marked `draft`, `languageReview: pending` and `ministryReview: pending`. The validator rejects attempts to mark a draft published or approved in this preparation format. The source comparison includes the ID, date, title, Scripture reference/text, body, ordered prayers/declarations, quotation, prophetic declaration and author. Missing, deleted or edited source records are flagged. No data is written by opening the review screen.

## Stage 4 handoff and eventual release

These drafts have not received independent fluent-speaker proofreading or ministry approval. Review both language accuracy and preservation of teaching before publication, particularly Yoruba and Hausa. Check tone, diacritics, references, names, paragraph continuity and every prayer/declaration. Record actual reviewer identity, language, corrected text, source hash and review date in a separate reviewed release record; never invent reviewer approval. If the original changes, regenerate the snapshot and review against the new source.

Public release requires a separate implementation that accepts reviewed records, verifies source hashes and preserves reviewed provenance. This draft-only format cannot be switched to public by an environment variable, a reader request or an admin-screen action. When that release is implemented, reuse the stored text for every reader and do not call translation providers on reads. Test cache/source invalidation and distinguish reviewed text from older automated translations in the reader notice. Do not overwrite older saved translations without retaining a recoverable version.

Prioritize small batches of current devotionals before the archive, then Sunday School lessons. Book translations require edition-specific rights/review and must not replace existing purchases. Songs, customer PDFs, private messages and AI narration are outside this pilot. Any future provider expense still requires an approved spending limit.

## Verification

Tests cover the full five-language pilot, source hashes, missing sections, duplicate or unsupported language codes, false approval states, admin isolation, absent public/write routes, source drift/deletion and storage failure. Existing rendered-screen tests protect user drafts, identifiers, prices, privacy values and localization. Production build inspection must also confirm that draft prose was not bundled into public client files.

Verified locally: TypeScript, the production build and all 92 tests passed with test-file concurrency limited to one. The initial concurrent run hit an existing 20 ms language-switch test timing assertion under build load; the full sequential rerun passed without application changes. Inspection of 274 public build files found no pilot draft prose or source hash. No real account creation, message, purchase, email delivery or paid generation was performed.
