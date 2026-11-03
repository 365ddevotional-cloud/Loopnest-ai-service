import assert from "node:assert/strict";
import { test } from "node:test";
import { devotionalShareUrl, shareMessage, sharePayload } from "./shareContent";

test("quick devotional shares stay small and preserve the exact date and language", () => {
  const url = devotionalShareUrl("2026-11-03", "?lang=yo&admin=secret");
  assert.equal(url, "https://365dailydevotional.com/devotional/2026-11-03?lang=yo");
  const data = sharePayload("Heavenly Peace", "Full devotional ".repeat(1000), url);
  assert.ok(JSON.stringify(data).length < 250);
  assert.equal(shareMessage(data), `Heavenly Peace\n\n${url}`);
});

test("shares without a permalink retain the entire original text", () => {
  const text = "Scripture, prayers, declarations, and author — complete text.";
  assert.deepEqual(sharePayload("Title", text), { title: "Title", text });
  assert.equal(shareMessage(sharePayload("Title", text)), text);
});
