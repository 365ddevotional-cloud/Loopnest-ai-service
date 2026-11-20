# Google Sola devotional recordings

The owner approved the final Google AI Studio Sola audition for Yoruba, Hausa,
Igbo and Nigerian Pidgin on 2026-11-20. The observed Get code configuration is
`gemini-3.8-flash-tts`, temperature 1, prebuilt voice `Sola`. Do not substitute
Flash-Lite, another voice or phonetic rewrites without a new audition.

## Live integration

Content translations → choose a published saved translation → Saved recording.
The new administrator-only Generate private Sola recording action prepares a
private PCM WAV for the exact complete script. Review the entire new recording
before publication. A short audition does not establish a full recording review.
Google AI Studio exports can also be uploaded as MP3 or 24 kHz mono 16-bit PCM WAV.
Existing MP3 uploads and English/device-voice playback are retained.

The existing unbilled free-tier Gemini key was connected privately on 2026-11-20.
Paid Google billing remains off. Generation requires all of:

- GEMINI_API_KEY (server secret, never VITE-prefixed)
- DEVOTIONAL_TTS_ENABLED=true
- DEVOTIONAL_TTS_FREE_TIER_CONFIRMED=true
- DEVOTIONAL_TTS_DAILY_CHARACTER_LIMIT: explicitly selected integer, 1–50000

The confirmation flag records an operational verification, not a Google billing
cap. The same API endpoint can incur charges with a billed project. Do not link
paid billing or repurpose the paid shop service account. Paid activation needs
separate spending authorization. App-side limits supplement the provider quota.

## Generation and playback controls

Only administrator POST requests from the same origin can generate. No reader
GET or Listen action calls Google. Full script maximum: 6000 characters. Output
limit: 8192 tokens; truncated/non-STOP output is rejected. One generation request
per exact script/model/voice is claimed in private R2 using ETag conditional writes.
A persistent daily character reservation is written before the provider call.
Reservations and permanent claims remain after an error, quota response, timeout
or storage failure. No automatic retries, including on later days. Repair requires
checking provider usage and saved bytes first; no public repair/reset route exists.
Daily allowance is UTC. Allowances are never increased by generation requests.

Generated audio stays private until the administrator reviews and publishes that
exact audio hash. A changed script invalidates the delivery path. Multiple users
reuse saved bytes via expiring private links. Generation and upload races cannot
replace an existing manifest; a concurrent manual upload wins. No new database,
staging service, microphone access or telemetry is needed.

## Scripture and spelling

Verified narration lookup currently covers **John 8:12 only**, using the exact
published Yoruba and Igbo words selected by the owner. It is not a complete Bible
integration. Other references retain their original source quotation until their
localized Bible wording is sourced and checked. Reader text/Bible selection is
unchanged; the administrator sees the exact narration script before generation.

The Yoruba/Igbo script change creates a new recording identity; the earlier
private ElevenLabs files remain stored under their previous identities and are
not relabelled as Sola recordings. This release does not publish those files or
translate the remaining devotional calendar.

Published wording and language style should guide future translation drafts.
Do not replace all Yoruba e/E characters globally, remove tone marks, or rewrite
Scripture phonetically. Keep exact Bible text apart from original commentary.

Biblica® Open Yoruba Contemporary Bible™, © 2009, 2017 Biblica, Inc.
Source: https://ebible.org/yor/JHN08.htm
Biblica® Open Igbo Contemporary Bible™, © 1980, 1988, 2019, 2020 Biblica, Inc.
Source: https://www.divinerevelations.info/documents/bible/All_HTML/igbo_bible/JHN08.htm
License for the quoted Bible text: CC BY-SA 4.0
https://creativecommons.org/licenses/by-sa/4.0/

## Verification

Automated provider tests use synthetic responses only, never a real charge.
Coverage includes disabled configuration, voice/model identity, preserved accent
marks, complete/invalid audio, permanent failure claims, simultaneous claims,
daily allowance exhaustion, admin/origin isolation, private publication, exact
script hashes, reusable delivery and existing English voice behavior.
A live generated full devotional and playback on the owner's physical phone
remain separate activation checks after the free-tier API key is connected.

## WAV compatibility and manual recovery

Provider WAV files may include optional metadata chunks or a larger fmt chunk.
Accept complete mono 24 kHz 16-bit PCM WAV, extract its data without changing
samples, and save a canonical WAV. Reject truncated or unsupported encodings.
The first full Yoruba and Hausa requests generated audio but the old rigid
44-byte-header validator rejected the provider WAV before storage.

An operator can authorize one manual recovery for an exact script/model/voice
claim with DEVOTIONAL_TTS_MANUAL_RECOVERY_IDS (comma-separated SHA-256 claim IDs).
This is only for checked missing/failed recordings. It does not retry by itself: an
administrator must issue the existing Generate POST again. The original claim
and reservation remain, the additional request reserves allowance atomically
under `<id>:manual-recovery-1`, and a second recovery cannot generate again.
Clear the allowlist after recovery. Published/saved Sola recordings are reused,
never replaced by this mechanism. Paid billing must stay off for this activation.
