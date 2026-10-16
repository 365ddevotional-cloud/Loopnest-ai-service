// Affordable regional prices, independently set; these are not USD conversions.
export const musicRegions: Record<string, { name: string; currency: string; single: number; five: number; stripe: boolean }> = {
  US: { name: 'United States / International', currency: 'USD', single: 89, five: 299, stripe: true },
  NG: { name: 'Nigeria', currency: 'NGN', single: 20000, five: 100000, stripe: true },
  GH: { name: 'Ghana', currency: 'GHS', single: 200, five: 1000, stripe: false },
  KE: { name: 'Kenya', currency: 'KES', single: 2000, five: 10000, stripe: true },
  ZA: { name: 'South Africa', currency: 'ZAR', single: 300, five: 1500, stripe: true },
  UG: { name: 'Uganda', currency: 'UGX', single: 60000, five: 300000, stripe: true },
  TZ: { name: 'Tanzania', currency: 'TZS', single: 50000, five: 250000, stripe: true },
  RW: { name: 'Rwanda', currency: 'RWF', single: 300, five: 1500, stripe: true },
  ZM: { name: 'Zambia', currency: 'ZMW', single: 500, five: 2500, stripe: true },
  BW: { name: 'Botswana', currency: 'BWP', single: 300, five: 1500, stripe: true },
  NA: { name: 'Namibia', currency: 'NAD', single: 300, five: 1500, stripe: true },
  EG: { name: 'Egypt', currency: 'EGP', single: 1000, five: 5000, stripe: true },
  MA: { name: 'Morocco', currency: 'MAD', single: 200, five: 1000, stripe: true },
  SN: { name: 'Senegal', currency: 'XOF', single: 100, five: 500, stripe: true },
  CI: { name: "Côte d’Ivoire", currency: 'XOF', single: 100, five: 500, stripe: true },
  CM: { name: 'Cameroon', currency: 'XAF', single: 100, five: 500, stripe: true },
};
export const musicTimezones: Record<string,string> = { 'Africa/Lagos':'NG','Africa/Accra':'GH','Africa/Nairobi':'KE','Africa/Johannesburg':'ZA','Africa/Kampala':'UG','Africa/Dar_es_Salaam':'TZ','Africa/Kigali':'RW','Africa/Lusaka':'ZM','Africa/Gaborone':'BW','Africa/Windhoek':'NA','Africa/Cairo':'EG','Africa/Casablanca':'MA','Africa/Dakar':'SN','Africa/Abidjan':'CI','Africa/Douala':'CM' };
export function musicRegion(country: unknown, timezone?: unknown) {
  const code = typeof country === 'string' ? country.toUpperCase() : '';
  return musicRegions[code] ? code : typeof timezone === 'string' && musicTimezones[timezone] ? musicTimezones[timezone] : 'US';
}
export function regionalMusicPrice(country: string, count: number) {
  const region = musicRegions[country] ?? musicRegions.US;
  const amount = count === 5 ? region.five : count === 3 ? (country === 'US' ? 189 : region.single * 3) : region.single;
  // Low regional unit prices are offered in a five-song collection to meet card minimums.
  const ready = region.stripe && (country === 'US' || count === 5);
  return { currency: region.currency, cents: amount, ready, message: !region.stripe ? `Payments in ${region.currency} are not available yet. You can still listen and watch for free.` : !ready ? 'Choose the five-song collection to use this affordable regional price. Small individual payments are below the card payment minimum.' : undefined };
}
export function formatMusicPrice(amount: number, currency: string) {
  const divisor = ['XOF','XAF','RWF'].includes(currency) ? 1 : 100;
  return new Intl.NumberFormat('en', {style:'currency', currency, currencyDisplay:'symbol', maximumFractionDigits: currency === 'UGX' ? 0 : undefined}).format(amount / divisor);
}
