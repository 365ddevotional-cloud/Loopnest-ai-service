# Local music checkout

Customer prices are resolved on the server using the request IP and a bundled
country database. Express trusts one Railway proxy hop. Before release, verify
that deployment topology and confirm the country returned for a known visitor.
Do not trust a browser country, timezone, CF-IPCountry, or leftmost forwarded IP.
Unknown locations fail closed with a support message instead of a USD price.
VPNs and carrier routing can affect location; this is not proof of residency.

The client receives one country's price only. There is no country selector,
price-list response, or bundled regional price table. Public repository readers
can see previously committed defaults, so confidentiality is limited; never
commit the full private price configuration to source or documentation.

## Private configuration

`MUSIC_REGIONAL_PRICES_JSON` is a JSON object keyed by ISO country code, with
positive integer `single` and `five` amounts in the processor's minor units.
It is staged in Railway separately from this PR. Apply it with the release.
There are 79 configured locations: 77 observed audience locations plus the
previously configured Morocco and Senegal. New country metadata requires an
associated private price entry. Invalid configuration fails startup.

Use minor units for Stripe; XAF, XOF, RWF, KRW, VUV, and MGA use whole units.
UGX uses two-decimal API representation despite its zero-decimal currency.
Unsupported KWD and OMR display using three decimal places.

GHS, ZWG, SDG, SSP, KWD, and OMR are absent from the reviewed Stripe US
presentment list. These currencies display local prices but cannot open checkout
until a compatible payment arrangement is implemented. Never substitute USD.
Other currency availability and minimum-charge acceptance must be verified on
the actual merchant account before claiming live support. Fixed prices are not
exchange-rate conversions; periodically review settlement minimums and fees.

Source: https://docs.stripe.com/currencies?presentment-currency=US (2026-10-16).
GeoIP: https://github.com/sapics/geoip-country; bundled GeoLite2 country data.
Preserve dependency license/EULA and refresh the pinned database periodically.
No recurring geolocation subscription; customer IPs stay on the app server.

## Verification

`node --import tsx --test server/music-commerce.test.ts`
`node --import tsx script/build.ts`

Tests use synthetic private prices to cover all region/currency paths without
publishing actual prices. They cover signed webhook/payment verification,
currency and amount isolation, query/body/header spoofing, unknown locations,
location changes, all configured currency paths, and IPv4/IPv6 lookup.
Mocked checkout tests do not establish live payment-provider acceptance.

Release requires approval because automatic review previously blocked pushing
production main. Reconnect Stripe for account-specific verification, approve the
review branch, apply only the staged music-price variable, merge, and verify
Railway health and the live customer/admin flows. Do not charge real customers
as a test. Keep the existing two-hour download window and free access intact.
