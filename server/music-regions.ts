// Country metadata only. Actual regional prices live in private runtime config.
// Stripe US presentment support checked 2026-10-16.
export const musicRegions: Record<string, {name: string; currency: string; stripe: boolean}> = {
  "US": {
    "name": "United States",
    "currency": "USD",
    "stripe": true
  },
  "NG": {
    "name": "Nigeria",
    "currency": "NGN",
    "stripe": true
  },
  "GH": {
    "name": "Ghana",
    "currency": "GHS",
    "stripe": false
  },
  "PH": {
    "name": "Philippines",
    "currency": "PHP",
    "stripe": true
  },
  "ZA": {
    "name": "South Africa",
    "currency": "ZAR",
    "stripe": true
  },
  "KE": {
    "name": "Kenya",
    "currency": "KES",
    "stripe": true
  },
  "ZM": {
    "name": "Zambia",
    "currency": "ZMW",
    "stripe": true
  },
  "UG": {
    "name": "Uganda",
    "currency": "UGX",
    "stripe": true
  },
  "CM": {
    "name": "Cameroon",
    "currency": "XAF",
    "stripe": true
  },
  "GB": {
    "name": "United Kingdom",
    "currency": "GBP",
    "stripe": true
  },
  "IN": {
    "name": "India",
    "currency": "INR",
    "stripe": true
  },
  "JM": {
    "name": "Jamaica",
    "currency": "JMD",
    "stripe": true
  },
  "ZW": {
    "name": "Zimbabwe",
    "currency": "ZWG",
    "stripe": false
  },
  "PG": {
    "name": "Papua New Guinea",
    "currency": "PGK",
    "stripe": true
  },
  "AU": {
    "name": "Australia",
    "currency": "AUD",
    "stripe": true
  },
  "CA": {
    "name": "Canada",
    "currency": "CAD",
    "stripe": true
  },
  "LR": {
    "name": "Liberia",
    "currency": "LRD",
    "stripe": true
  },
  "SA": {
    "name": "Saudi Arabia",
    "currency": "SAR",
    "stripe": true
  },
  "MY": {
    "name": "Malaysia",
    "currency": "MYR",
    "stripe": true
  },
  "NA": {
    "name": "Namibia",
    "currency": "NAD",
    "stripe": true
  },
  "TT": {
    "name": "Trinidad and Tobago",
    "currency": "TTD",
    "stripe": true
  },
  "AE": {
    "name": "United Arab Emirates",
    "currency": "AED",
    "stripe": true
  },
  "BW": {
    "name": "Botswana",
    "currency": "BWP",
    "stripe": true
  },
  "BS": {
    "name": "Bahamas",
    "currency": "BSD",
    "stripe": true
  },
  "HK": {
    "name": "Hong Kong",
    "currency": "HKD",
    "stripe": true
  },
  "IT": {
    "name": "Italy",
    "currency": "EUR",
    "stripe": true
  },
  "SG": {
    "name": "Singapore",
    "currency": "SGD",
    "stripe": true
  },
  "GY": {
    "name": "Guyana",
    "currency": "GYD",
    "stripe": true
  },
  "ID": {
    "name": "Indonesia",
    "currency": "IDR",
    "stripe": true
  },
  "TZ": {
    "name": "Tanzania",
    "currency": "TZS",
    "stripe": true
  },
  "GM": {
    "name": "Gambia",
    "currency": "GMD",
    "stripe": true
  },
  "BZ": {
    "name": "Belize",
    "currency": "BZD",
    "stripe": true
  },
  "FJ": {
    "name": "Fiji",
    "currency": "FJD",
    "stripe": true
  },
  "NZ": {
    "name": "New Zealand",
    "currency": "NZD",
    "stripe": true
  },
  "SZ": {
    "name": "Eswatini",
    "currency": "SZL",
    "stripe": true
  },
  "MZ": {
    "name": "Mozambique",
    "currency": "MZN",
    "stripe": true
  },
  "NL": {
    "name": "Netherlands",
    "currency": "EUR",
    "stripe": true
  },
  "TG": {
    "name": "Togo",
    "currency": "XOF",
    "stripe": true
  },
  "VI": {
    "name": "U.S. Virgin Islands",
    "currency": "USD",
    "stripe": true
  },
  "BJ": {
    "name": "Benin",
    "currency": "XOF",
    "stripe": true
  },
  "BR": {
    "name": "Brazil",
    "currency": "BRL",
    "stripe": true
  },
  "CD": {
    "name": "Congo–Kinshasa",
    "currency": "CDF",
    "stripe": true
  },
  "CN": {
    "name": "China",
    "currency": "CNY",
    "stripe": true
  },
  "CZ": {
    "name": "Czechia",
    "currency": "CZK",
    "stripe": true
  },
  "DE": {
    "name": "Germany",
    "currency": "EUR",
    "stripe": true
  },
  "DM": {
    "name": "Dominica",
    "currency": "XCD",
    "stripe": true
  },
  "FR": {
    "name": "France",
    "currency": "EUR",
    "stripe": true
  },
  "GP": {
    "name": "Guadeloupe",
    "currency": "EUR",
    "stripe": true
  },
  "HU": {
    "name": "Hungary",
    "currency": "HUF",
    "stripe": true
  },
  "KR": {
    "name": "South Korea",
    "currency": "KRW",
    "stripe": true
  },
  "LB": {
    "name": "Lebanon",
    "currency": "LBP",
    "stripe": true
  },
  "RW": {
    "name": "Rwanda",
    "currency": "RWF",
    "stripe": true
  },
  "SB": {
    "name": "Solomon Islands",
    "currency": "SBD",
    "stripe": true
  },
  "SC": {
    "name": "Seychelles",
    "currency": "SCR",
    "stripe": true
  },
  "SD": {
    "name": "Sudan",
    "currency": "SDG",
    "stripe": false
  },
  "VC": {
    "name": "St. Vincent and the Grenadines",
    "currency": "XCD",
    "stripe": true
  },
  "VU": {
    "name": "Vanuatu",
    "currency": "VUV",
    "stripe": true
  },
  "AI": {
    "name": "Anguilla",
    "currency": "XCD",
    "stripe": true
  },
  "AO": {
    "name": "Angola",
    "currency": "AOA",
    "stripe": true
  },
  "BB": {
    "name": "Barbados",
    "currency": "BBD",
    "stripe": true
  },
  "CH": {
    "name": "Switzerland",
    "currency": "CHF",
    "stripe": true
  },
  "CI": {
    "name": "Côte d’Ivoire",
    "currency": "XOF",
    "stripe": true
  },
  "CO": {
    "name": "Colombia",
    "currency": "COP",
    "stripe": true
  },
  "CW": {
    "name": "Curaçao",
    "currency": "XCG",
    "stripe": true
  },
  "EG": {
    "name": "Egypt",
    "currency": "EGP",
    "stripe": true
  },
  "ET": {
    "name": "Ethiopia",
    "currency": "ETB",
    "stripe": true
  },
  "KW": {
    "name": "Kuwait",
    "currency": "KWD",
    "stripe": false
  },
  "MG": {
    "name": "Madagascar",
    "currency": "MGA",
    "stripe": true
  },
  "ML": {
    "name": "Mali",
    "currency": "XOF",
    "stripe": true
  },
  "MX": {
    "name": "Mexico",
    "currency": "MXN",
    "stripe": true
  },
  "NE": {
    "name": "Niger",
    "currency": "XOF",
    "stripe": true
  },
  "OM": {
    "name": "Oman",
    "currency": "OMR",
    "stripe": false
  },
  "PK": {
    "name": "Pakistan",
    "currency": "PKR",
    "stripe": true
  },
  "SS": {
    "name": "South Sudan",
    "currency": "SSP",
    "stripe": false
  },
  "TR": {
    "name": "Türkiye",
    "currency": "TRY",
    "stripe": true
  },
  "UZ": {
    "name": "Uzbekistan",
    "currency": "UZS",
    "stripe": true
  },
  "VG": {
    "name": "British Virgin Islands",
    "currency": "USD",
    "stripe": true
  },
  "MA": {
    "name": "Morocco",
    "currency": "MAD",
    "stripe": true
  },
  "SN": {
    "name": "Senegal",
    "currency": "XOF",
    "stripe": true
  }
};
export type MusicPrices = Record<string, {single: number; five: number}>;
export function readMusicPrices(raw?: string): MusicPrices {
  // Existing approved prices remain available while private configuration is staged.
  const defaults: MusicPrices = {US:{single:89,five:299}, NG:{single:20000,five:100000}, GH:{single:180,five:900}};
  if (!raw) return defaults;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid music price configuration');
  const prices: MusicPrices = {...defaults};
  for (const [code,value] of Object.entries(parsed)) {
    const v = value as {single?: unknown; five?: unknown};
    if (!musicRegions[code] || !v || !Number.isSafeInteger(v.single) || !Number.isSafeInteger(v.five) || Number(v.single) <= 0 || Number(v.five) < 50) throw new Error('Invalid music price configuration');
    prices[code] = {single:Number(v.single),five:Number(v.five)};
  }
  return prices;
}
export function regionalMusicPrice(country: string, count: number, prices: MusicPrices) {
  const region = musicRegions[country], configured = prices[country];
  if (!region || !configured) throw Object.assign(new Error("A local music price is not available for your location yet. Please contact support."), {status: 409});
  const amount = count === 5 ? configured.five : count === 3 ? (country === 'US' ? 189 : configured.single * 3) : configured.single;
  const ready = region.stripe && (country === 'US' || count === 5);
  return { currency: region.currency, cents: amount, ready, message: !region.stripe ? `Payments in ${region.currency} are not available yet. You can still listen and watch for free.` : !ready ? 'Choose the five-song collection to use this affordable local price.' : undefined };
}
