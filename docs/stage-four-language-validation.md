# Stage 4 language validation — November 19, 2026

## Verified live

Production was already running commit 31df6916b71c3de9f32bf2349f23e91ecb60397d (Stage 3 pilot). The user completed the secure administrator-password flow; the actual authenticated dashboard and Content translations panel were then inspected. No credential values were read or recorded.

All five draft selections loaded correctly and displayed the saved source as matching the current production devotional. The original Scripture text was identical in every selection. Each draft contained seven prayer points and four faith declarations and remained explicitly unpublished, with language and ministry review pending.

| Language | Displayed title | Narrow viewport | Page width | Review |
| --- | --- | ---: | ---: | --- |
| Spanish | Luz gloriosa | 332 CSS px | 332 CSS px | Pending |
| French | Lumière glorieuse | 332 CSS px | 332 CSS px | Pending |
| Yoruba | Ìmọ́lẹ̀ Ológo | 332 CSS px | 332 CSS px | Pending |
| Nigerian Pidgin | Glorious Light | 332 CSS px | 332 CSS px | Pending |
| Hausa | Haske Mai Ɗaukaka | 332 CSS px | 332 CSS px | Pending |

At 332 CSS px, both review columns stacked at the same left coordinate with a measured width of 266.75 CSS px. No horizontal page overflow was observed. The normal desktop view was restored at the end and measured 1355 CSS px with no horizontal overflow.

Additional read-only live checks:

| Screen | Viewport width | Page width |
| --- | ---: | ---: |
| Yoruba prayer/counseling form | 332 CSS px | 332 CSS px |
| French shop | 332 CSS px | 332 CSS px |
| Hausa church landing | 446 CSS px | 446 CSS px |

These are narrow browser CSS-layout checks obtained with ordinary browser zoom, not physical iPhone/Android testing or touch/device emulation. Managed-browser DevTools was unavailable; that protection was not bypassed. Browser zoom was restored to normal. No prayer submission, purchase, email, account creation or paid translation/narration generation occurred.

## Remaining editorial gate

No independent fluent-speaker review or ministry approval has taken place. The five assistant-prepared translations remain drafts. Structural and display checks do not certify natural wording, grammar, dialect, doctrine or suitability for publication. Do not mark these checks as native-language approval.

A trusted volunteer for each language should compare the full draft against the English source: four paragraphs, seven prayers, four declarations, attributed quotation and prophetic declaration. Check John 8:12 and the internal John 3:19–21 reference; preserve names, Scripture meaning, the call for prayer/counseling and the distinction between Christ's guidance and human desires. Record corrections and actual reviewer identity/date against source hash b0f978bf3b182fc8d7578d43790067635cca53d29f9b502435d9dd03e1bc9dbe. No reviewer identity or sign-off has been invented.

There is no publication endpoint or publication action in the review panel. Public release remains a separate reviewed implementation, as described in docs/stage-three-content-translation-review.md. This verification adds no app code, service or spending allowance. The saved-only reader path and zero new paid generation allowance remain unchanged.

## Prior automated evidence

The Stage 3 production build and TypeScript check passed. Its full sequential regression run passed all 92 tests; CI passed before deployment. No additional tests were run for this documentation-only verification. Full archive/book translation, fluent-speaker review and physical-device checks are not complete.
