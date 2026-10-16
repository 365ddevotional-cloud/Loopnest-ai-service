import type { Request } from "express";
// @ts-expect-error geoip-country does not ship TypeScript declarations.
import geoip from "geoip-country";
import { isIP } from "node:net";

// Local database: no paid geolocation API and no customer IP sent to a third party.
// req.ip uses Express's configured trusted Railway proxy. Never trust a client
// country, timezone, CF-IPCountry, or the leftmost forwarded header directly.
export function musicCountryFromRequest(req: Request): string | null {
  const ip = req.ip?.replace(/^::ffff:/, "");
  if (!ip || !isIP(ip)) return null;
  try { return geoip.lookup(ip)?.country ?? null; } catch { return null; }
}
