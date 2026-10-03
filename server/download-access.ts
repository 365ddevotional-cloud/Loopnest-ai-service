// Only call this with claims from a cryptographically verified Firebase ID token.
export function getDownloadAccess(claims: { email?: unknown; email_verified?: unknown }) {
  const eligible = typeof claims.email === "string" &&
    claims.email.trim().toLowerCase() === "365ddevotional@gmail.com";
  const lifetimeFreeDownloads = eligible && claims.email_verified === true;
  return {
    lifetimeFreeDownloads,
    verificationRequired: eligible && !lifetimeFreeDownloads,
    scope: lifetimeFreeDownloads ? "all_downloads" : null,
    expiresAt: null,
  };
}
