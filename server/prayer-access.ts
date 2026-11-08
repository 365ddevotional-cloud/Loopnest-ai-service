import type { Request, Response } from "express";
import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { getUncachableSendGridClient } from "./sendgrid";

type PrayerSession = { prayerEmail?: string; prayerEmailVerifiedUntil?: number; prayerChallenge?: { email: string; digest: string; expires: number; attempts: number; nextSend: number }; prayerSubmittedIds?: number[] };
const throttle = new Map<string, number>();
const normalize = (email: string) => email.trim().toLowerCase();
function digest(email: string, code: string) {
 return createHmac("sha256", process.env.SESSION_SECRET || "development-only").update(email + ":" + code).digest("hex");
}
export function isVerifiedPrayerEmail(req: Request, email: string) {
 const s = req.session as typeof req.session & PrayerSession;
 return !!s.prayerEmail && s.prayerEmail === normalize(email) && !!s.prayerEmailVerifiedUntil && s.prayerEmailVerifiedUntil > Date.now();
}
export function isPrayerOwner(req: Request, request: { id: number; email: string | null; firebaseUid?: string | null }) {
 const s = req.session as typeof req.session & PrayerSession;
 return !!req.session?.isAdmin ||
   (!!request.email && isVerifiedPrayerEmail(req, request.email)) ||
   !!s.prayerSubmittedIds?.includes(request.id);
}
export async function startPrayerEmailVerification(req: Request, res: Response) {
 const email = typeof req.body?.email === "string" ? normalize(req.body.email) : "";
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({message:"Enter a valid email"});
 const s = req.session as typeof req.session & PrayerSession;
 const now = Date.now();
 if ((s.prayerChallenge?.nextSend || 0) > now || (throttle.get(email) || 0) > now) return res.status(429).json({message:"Please wait before requesting another code"});
 // Limit growth of in-memory throttling map; this is a supplementary guard, not a distributed rate limiter.
 if (throttle.size > 20000) throttle.clear();
 throttle.set(email, now + 60_000);
 const code = String(randomInt(100000,1000000));
 s.prayerChallenge = {email,digest:digest(email,code),expires:now+10*60_000,attempts:0,nextSend:now+60_000};
 try {
  const {client,fromEmail} = await getUncachableSendGridClient();
  await client.send({to:email,from:fromEmail,subject:"Prayer request access verification",
   text:`Your 365 Daily Devotional prayer access code is ${code}. It expires in 10 minutes. Do not share this code.`,
   html:`<p>Your 365 Daily Devotional prayer access code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. Do not share this code.</p>`});
  res.json({message:"If delivery is available, a verification code has been sent."});
 } catch {
  s.prayerChallenge = undefined;
  res.status(503).json({message:"Email verification is temporarily unavailable. Please try again later."});
 }
}
export function confirmPrayerEmailVerification(req: Request, res: Response) {
 const email = typeof req.body?.email === "string" ? normalize(req.body.email) : "";
 const code = typeof req.body?.code === "string" ? req.body.code : "";
 const s = req.session as typeof req.session & PrayerSession;
 const ch = s.prayerChallenge;
 if (!ch || ch.email !== email || ch.expires < Date.now() || ch.attempts >= 5 || !/^\d{6}$/.test(code)) return res.status(403).json({message:"Invalid or expired code"});
 ch.attempts++;
 const a=Buffer.from(ch.digest,"hex"),b=Buffer.from(digest(email,code),"hex");
 if (a.length!==b.length || !timingSafeEqual(a,b)) return res.status(403).json({message:"Invalid or expired code"});
 s.prayerEmail=email;
 s.prayerEmailVerifiedUntil=Date.now()+24*60*60_000;
 s.prayerChallenge=undefined;
 res.json({verified:true});
}
export function rememberSubmittedPrayer(req: Request,id:number) {
 const s=req.session as typeof req.session & PrayerSession;
 s.prayerSubmittedIds=[...(s.prayerSubmittedIds||[]).slice(-9),id];
}
