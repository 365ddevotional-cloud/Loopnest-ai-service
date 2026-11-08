import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

// Release gate: prayer and counseling records must not be exposed by knowing an
// email address or sequential request ID. These tests intentionally fail until
// the legacy endpoints are migrated to verified session/token ownership.
const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
function routeBlock(start: string, end: string) {
 const from = routes.indexOf(start);
 assert.ok(from >= 0, `Missing route: ${start}`);
 const to = routes.indexOf(end, from + start.length);
 assert.ok(to > from, `Missing boundary: ${end}`);
 return routes.slice(from, to);
}
test("individual prayer requests require admin or verified ownership", () => {
 const code = routeBlock("app.get(api.prayerRequests.get.path", "// Update prayer request status");
 assert.match(code, /requireAdmin|verifyFirebaseToken|requireUser|verifyPrayerAccess|isPrayerOwner|isVerifiedPrayerEmail|isPrayerOwner/);
});
test("prayer inbox lookup must not authorize using email query alone", () => {
 const code = routeBlock('app.get("/api/my-prayer-requests"', "// User-facing: Mark admin messages");
 assert.match(code, /verifyFirebaseToken|requireUser|verifyPrayerAccess|isPrayerOwner|isVerifiedPrayerEmail/);
});
test("thread read must not rely on email query alone", () => {
 const code = routeBlock("app.get(api.prayerRequests.getThread.path", "// Add thread message");
 assert.match(code, /verifyFirebaseToken|requireUser|verifyPrayerAccess|isPrayerOwner|isVerifiedPrayerEmail/);
});
test("thread write must require verified ownership for non-admin senders", () => {
 const code = routeBlock("app.post(api.prayerRequests.addThreadMessage.path", "// User-facing: Get prayer requests");
 assert.match(code, /verifyFirebaseToken|requireUser|verifyPrayerAccess|isPrayerOwner|isVerifiedPrayerEmail/);
});
