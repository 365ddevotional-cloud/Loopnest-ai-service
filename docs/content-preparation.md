# Owner-authorized devotional and Sunday School preparation

The owner authorized preparation, checking and publication on 20 November 2026 without a per-recording listening checkbox. This policy is explicitly recorded as `owner-authorized-automated-review`; it does not claim human listening or native-speaker verification.

The existing admin Content translation review page can plan a five-calendar-month window, covering four languages (Yoruba, Hausa, Igbo and Nigerian Pidgin) for each active devotional and Sunday School lesson. The verified current window is 20 November 2026 through 19 April 2027: 151 devotionals and 22 school lessons, or 692 language editions. This is planned coverage, not a claim that all files already exist.

Required private Railway flags: `CONTENT_PREPARATION_ENABLED=true`, `CONTENT_PREPARATION_OWNER_AUTHORIZED=true`, existing confirmed-free Gemini configuration, and the existing private R2 recording store. No new service, bucket, database or subscription is created. The worker operates every 70 seconds on the current service and persists its plan with conditional writes in private R2. Generation is limited per day (default 80 text requests, 10 audio requests) as well as by the shared TTS character allowance and Google quotas. This application limit is not a billing-provider spending guarantee. Keep the Google project unbilled.

Text passes exact field/list/paragraph checks, source-length checks, a separate language/content review, and pinned official Yoruba/Igbo Scripture quotation comparison. Audio covers the complete approved script, split only at paragraph boundaries; all parts must exist before the audio manifest is published. Review failures and ambiguous provider failures block the job for inspection. A known quota response waits until the next safe quota-reset window (09:00 UTC, after Pacific midnight). A saved translation draft is reused if a subsequent review request hits quota. Readers cannot trigger synthesis, and content edits invalidate the matching translation and recording.

Public devotional audio is unavailable before the devotional date. Previously public Sunday School availability is preserved. Files remain in the private bucket, delivered through short-lived signed URLs. Source hashes, language and edition bind each public manifest to the exact saved source. Hausa playback defaults to 0.85×; other prepared recordings default to 0.92× and listeners can select their own speed.

## Scripture sources

`server/content-translations/verified-scriptures-2026-11-20.json` contains the 165 distinct references used in this window. Yoruba quotes are from Biblica Open Yoruba Contemporary Bible, and Igbo quotes from Biblica Open Igbo Contemporary Bible, © Biblica, licensed CC BY-SA 4.0. Each quote records its actual eBible chapter URL (`https://ebible.org/yor/` and `https://ebible.org/ibo/`). Quote text is copied unchanged, including tone marks. Partial cited verses use the complete published verse, clearly labeled with the actual edition instead of KJV/WEB. The separate original devotional teaching remains distinct from the Bible quotation; English source records are unchanged. Source and license attribution appears beside the prepared Scripture text even before narration is ready.

## Validation

`node --import tsx --test server/content-preparation.test.ts server/devotional-recordings.test.ts server/devotional-google-voice.test.ts`

Coverage includes admin and same-origin protection, source changes, future-date access, private delivery, concurrent claims, ambiguous failures, daily limits, verified quotations, structural validation and saved-byte reuse. The full production workflow additionally performs TypeScript checks and app regression checks.

## Temporary text-service interruptions

Google returned an explicit HTTP 503 on the first live text request. Text preparation now backs off on that known status and stops after three transient failures, within the daily request reservation. This recovery never retries a voice-provider request. The exact-source November 20 translations were prepared and checked by the assistant under the owner authorization and included as a source-hashed seed, so today does not depend on Google's text endpoint. They still pass all structural and pinned-Scripture checks before saving; they are not labeled as independently native-speaker reviewed. A changed English source cannot use that seed.
