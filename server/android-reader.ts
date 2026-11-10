import type { Request } from "express";
import { androidAppPackage, isAndroidAppReferrer, isAndroidAppUserAgent } from "../shared/android-reader";

export function isAndroidReaderRequest(req: Request): boolean {
  return req.get("x-365-android-reader") === "1" ||
    req.get("x-requested-with") === androidAppPackage ||
    isAndroidAppUserAgent(req.get("user-agent") ?? "") ||
    isAndroidAppReferrer(req.get("referer") ?? "");
}
