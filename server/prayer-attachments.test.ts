import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import { parsePrayerSubmission } from "./prayer-attachments";

test("prayer submission validates private attachment uploads and preserves JSON submissions", async () => {
  const app = express();
  app.use(express.json());
  app.post("/prayer", parsePrayerSubmission, (req, res) => {
    res.json({ request: req.body, files: res.locals.prayerFiles?.map((file: { bytes: Buffer }) => file.bytes.length) });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/prayer`;

  function formWithFiles(files: Blob[]) {
    const form = new FormData();
    form.append("request", JSON.stringify({ message: "Synthetic request" }));
    for (const file of files) form.append("attachments", file, "example.pdf");
    return form;
  }

  try {
    const request = { message: "Synthetic request" };
    const normal = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    assert.deepEqual(await normal.json(), { request });

    const pdf = new Blob(["%PDF-fixture"], { type: "application/pdf" });
    const valid = await fetch(url, { method: "POST", body: formWithFiles([pdf, pdf, pdf]) });
    assert.equal(valid.status, 200);
    assert.deepEqual(await valid.json(), { request, files: [pdf.size, pdf.size, pdf.size] });

    const wrongType = new Blob(["fake"], { type: "application/pdf" });
    const oversized = new Blob(["%PDF-", new Uint8Array(5 * 1024 * 1024)], { type: "application/pdf" });
    for (const files of [[wrongType], [oversized], [pdf, pdf, pdf, pdf]]) {
      const invalid = await fetch(url, { method: "POST", body: formWithFiles(files) });
      assert.equal(invalid.status, 400);
    }

    const invalidBody = formWithFiles([pdf]);
    invalidBody.set("request", "{");
    assert.equal((await fetch(url, { method: "POST", body: invalidBody })).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
