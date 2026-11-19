# Translated devotional playback and notice removal

User report: the approved Yoruba devotional displayed an unwanted translation explanation and Listen produced no audible output on the user's iPhone.

The explanation is removed from successfully translated content, including the approved pilot. Original-language fallback notices remain when translated content is unavailable. Source hashes and owner publication approval remain unchanged in the server/admin record; no claim of independent review is added.

Inspection found two defects: speech was always assigned an English voice, and the public devotional route omitted AudioMiniPlayer, hiding playback controls and device errors. Public routes now include the player. Devotional speech uses the actual content language, not merely the menu language; untranslated English content still requests an English voice. A saved English voice cannot override a Yoruba/Hausa/French/Spanish reading. Pidgin prefers a dedicated Pidgin voice, then Nigerian English, then another installed English voice.

An installed matching voice is required for reliable Yoruba/Hausa speech. The app cannot install voices or make an iPhone support an unavailable language. It now reports missing voices rather than silently treating an English voice as native narration. Translated devotionals preload the same saved English source through the existing GET endpoint and offer a clearly labelled English-original audio button after failure. A separate user tap starts that reading synchronously, preserving mobile speech activation. No voice provider, paid synthesis, new service or budget change is introduced.

Speech resumes a previously paused browser queue before a new utterance. A retained utterance reference and session guards continue to reject stale callbacks. A startup timer reports a speech engine that never emits a start/end/error event instead of leaving an indefinite playing indicator. The timer is cleared on start, stop, error and pause. Media volume, mute state and actual sound output on the user's iPhone cannot be verified from this environment.

Regression coverage includes requested-language voice selection, incompatible saved voices, absent language voices, English fallback, asynchronous voice availability, Pidgin voice preference, paused queues, silent startup and unchanged English preferences. A rendered devotional/player test verifies the notice is absent, the missing-language error is visible, the prefetched English source is reused and a second tap starts English speech. Test voices are fixtures, not evidence of audible playback on a physical iPhone.

Validation: all 105 tests, TypeScript and the production build passed locally. This includes seven new speech/rendered-reader tests. No paid voice request, real purchase, email or prayer submission was performed.
