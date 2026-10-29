// Formatting only. Regional price tables must remain on the server.
export function formatMusicPrice(amount: number, currency: string) {
  const divisor = ['XOF','XAF','RWF','KRW','VUV','MGA'].includes(currency) ? 1 : ['KWD','OMR'].includes(currency) ? 1000 : 100;
  const locale = currency === 'NGN' ? 'en-NG' : currency === 'GHS' ? 'en-GH' : 'en';
  return new Intl.NumberFormat(locale, {style:'currency', currency, currencyDisplay:'symbol', maximumFractionDigits: currency === 'UGX' ? 0 : undefined}).format(amount / divisor);
}
