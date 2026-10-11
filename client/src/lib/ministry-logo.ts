export const MINISTRY_LOGOS = {
  still: "/365-logo.jpeg",
  preferred: "/branding/365-jesus-christ-is-lord.gif",
  white: "/branding/365-white-outline-jesus-christ-is-lord.gif",
  gold: "/branding/365-gold-outline-jesus-christ-is-lord.gif",
} as const;

// Retain the existing call signature; the approved gold GIF is now used everywhere.
export function logoForSeed(_seed: string | number): string {
  return MINISTRY_LOGOS.preferred;
}

export function normalizeMinistryLogo(value: string | null | undefined): string | null | undefined {
  return value === "alternate" || value === MINISTRY_LOGOS.white || value === MINISTRY_LOGOS.gold
    ? MINISTRY_LOGOS.preferred : value;
}

// Empty string explicitly means no logo. Preserve custom logos and the still option.
export function resolveUploadLogo(value: string | null | undefined, _seed: string | number): string | null {
  if (value === "") return null;
  return normalizeMinistryLogo(value) ?? MINISTRY_LOGOS.preferred;
}

export function isStillLogoRoute(route: string): boolean {
  return route === "/" || route === "/devotional/today";
}
