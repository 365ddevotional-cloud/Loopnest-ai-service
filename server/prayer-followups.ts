import { storage } from "./storage";

const FOLLOW_UP_MESSAGES: Record<number, string> = {
  2: "Hello, we are still praying for you. How are things going with your prayer request? We want you to know that you are not alone — the Lord hears every prayer.\n\n\"The Lord is near to all who call on Him.\" — Psalm 145:18",
  5: "We continue to lift your request before the Lord. Be encouraged today:\n\n\"The righteous cry out, and the Lord hears them; He delivers them from all their troubles.\"\n— Psalm 34:17\n\nStay strong in faith. God is working even when we cannot see it.",
  7: "Has God answered your prayer? We would love to celebrate your testimony with you.\n\nIf God has moved in your situation, consider sharing your testimony to encourage others.\n\n\"Come and hear, all you who fear God, and I will tell what He has done for my soul.\"\n— Psalm 66:16",
};

export async function runPrayerFollowUps() {
  for (const [dayStr, message] of Object.entries(FOLLOW_UP_MESSAGES)) {
    const dayNumber = Number(dayStr);
    try {
      const requests = await storage.getRequestsNeedingFollowUp(dayNumber);
      for (const request of requests) {
        try {
          await storage.createFollowUp(request.id, dayNumber, message);
          await storage.createThreadMessage({
            requestId: request.id,
            message,
            senderType: "admin",
          });
          console.log(`[FollowUp] Day ${dayNumber} follow-up sent for request #${request.id}`);
        } catch (err) {
          console.error(`[FollowUp] Failed for request #${request.id} day ${dayNumber}:`, err);
        }
      }
    } catch (err) {
      console.error(`[FollowUp] Error checking day ${dayNumber}:`, err);
    }
  }
}
