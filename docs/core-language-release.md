# Reader language release

Scope: 365 Daily Devotional reader navigation, Bible control labels, Sunday School lesson controls, and private feedback. These controls use the existing English, Spanish, French, Yoruba, Nigerian Pidgin and Hausa options. The new 87 UI messages are bundled locally and require no translation-provider subscription or per-reader API call.

Language selection updates mounted controls without a page reload, preserves query parameters and anchors, and synchronizes across tabs. Blocked local storage falls back safely. Devotional queries use the language captured in their query key, so an in-flight old request cannot populate another language's cache. Only English responses write the existing offline devotional store.

## Content and cost policy

Public devotional requests now only read the existing translation table. They cannot generate, retry, or write translated content. An absent translation returns the original content. No environment variable can re-enable paid generation on this path. The approved new-translation generation budget is zero. Existing audio generation allowances are unrelated and unchanged.

Previously saved automated devotional translations remain available and are identified as automated. They have not received native-language editorial or theological review. The selected Bible edition remains authoritative for Bible text; changing menu language does not translate Scripture, lessons, book files, or narration. New UI translations likewise still need native-speaker proofreading, particularly Yoruba, Hausa and Nigerian Pidgin.

## Validation and rollout

Automated checks cover all 87 new UI keys and interpolation placeholders, live language changes with an unsent draft, cross-tab changes, blocked storage, unsafe language codes, original/saved-content notices, and concurrent read-only saved-translation lookups against PostgreSQL-compatible storage. Verified locally: TypeScript check, production build, and all 76 regression tests passed (including five language/cost tests). No real paid order or email delivery was exercised.

No schema migration, authentication change, new hosting service, paid translation request, or production feedback submission is part of this release. Deploy through the existing main-branch Railway pipeline. Check the actual commit and successful deployment before reporting live.

## Remaining work

This is the first reader-interface phase. Church/group administration, commerce, settings, other feature screens, and much existing hard-coded UI text remain outside it. This does not complete all 1,266 pre-existing English message keys in every language. Translating teachings or complete books requires a separate reviewed workflow, rights checks where relevant, and an explicit spending limit before any paid generation.
