# Stage 2: settings, accounts, commerce and church interface languages

## Scope

Extend the existing six UI language choices (English, Spanish, French, Yoruba, Nigerian Pidgin and Hausa) across the screens listed in client/src/locales/stage-two-scope.json. The scope includes settings and mobile settings; sign-in, account recovery and profile controls; private prayer/counseling forms, inbox and request history; storefront, checkout, purchase library, book reader and personal library; church public/member/leadership/administration pages; private groups and the pastor dashboard.

561 additional English interface phrases have Spanish/French/Yoruba/Pidgin/Hausa entries. Each of the three previously sparse African-language dictionaries gains 1,529 entries, including existing church/group messages. Existing translations are preserved. Exact interface phrases reuse their existing keys where available. Standard option names are localized at render time, keeping API values unchanged. Interpolation preserves opaque price strings and diagnostic codes. No DOM text rewriting or external translator is used.

## Content and cost boundaries

Book manuscripts, titles, PDFs, narration, song lyrics, original Scripture quotations, church-created text, private messages and account identifiers keep their original content. Policy prose remains in its original English with an original-language notice. Device voice names and country names are preserved. Standard department/group/role names are UI labels; custom names remain unchanged when no known label exists.

The public devotional translation path remains saved-only with zero new paid generation allowance. No paid model request, subscription, new service, migration, authentication change, rate change, price change or narration-budget increase is included. No real customer message or real paid order is submitted by validation. Existing Google Play checkout gating is preserved.

## Validation

New tests exercise actual rendered sign-in, settings, prayer form, checkout and library components with local service fixtures. They verify credentials/unsent text survive a language change, return URLs remain intact, original Scripture remains original, diagnostic codes survive localization, and a mocked GBP 11.98 Read + Listen purchase sends the original product, currency, 1198 minor-unit amount and purchaseKind. The fixture does not contact Stripe or Firebase.

Catalogue checks cover every statically referenced key/phrase in the scope across all six locales, preserve placeholders and reject translation calls in machine attributes. Content checks guard against routing private messages, lyrics or book text through the interface translator. Production CI runs these tests. Verified locally: TypeScript, production build and all 84 regression tests passed, including eight new catalogue/rendered-screen tests. The source comparison against the Stage 1 base also confirmed machine attributes and routes were unchanged before the invariant regression was added.

## Review and remaining stages

These translations have not received native-speaker proofreading or full editorial approval. Stage 3 concerns reviewed content translation; Stage 4 concerns fluent-language review and broader device/layout checks. Full platform-owner administration and specialist book publishing tools remain outside this reader/church-interface scope. Existing English fallback remains available for uncommon server diagnostics and custom values without a catalogue entry.

Use the existing main-branch Railway deployment; do not recreate paid staging services. Confirm the deployed commit and live public screens before reporting the update live.
