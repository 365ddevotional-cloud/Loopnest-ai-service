// Recognize both the Capacitor release and older Play-distributed TWA launches.
export const androidAppPackage = "app.replit.attachment_parser__365ddevotional.twa";
export const androidReaderUserAgent = "365DevotionalAndroid";

export function isAndroidAppReferrer(referrer: string): boolean {
  return referrer === `android-app://${androidAppPackage}` ||
    referrer.startsWith(`android-app://${androidAppPackage}/`);
}

export function isAndroidAppUserAgent(userAgent: string): boolean {
  return userAgent.includes(androidReaderUserAgent) ||
    (/\bAndroid\b/i.test(userAgent) && /;\s*wv\b/i.test(userAgent));
}
