export const MINISTRY_LOGOS = {
  still: "/365-logo.jpeg",
  white: "/branding/365-white-outline-jesus-christ-is-lord.gif",
  gold: "/branding/365-gold-outline-jesus-christ-is-lord.gif",
} as const;

export function logoForSeed(seed: string | number): string {
  const index = typeof seed === "number" ? seed : Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return index % 2 === 0 ? MINISTRY_LOGOS.white : MINISTRY_LOGOS.gold;
}

// Only upload defaults may contain "alternate". Songs always store a real URL.
// Empty string explicitly means no logo; null/undefined use the ministry default.
export function resolveUploadLogo(value: string | null | undefined, seed: string | number): string | null {
  if (value === "") return null;
  return value == null || value === "alternate" ? logoForSeed(seed) : value;
}

export function isStillLogoRoute(route: string): boolean {
  return route === "/" || route === "/devotional/today";
}
