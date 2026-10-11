import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import session from "express-session";
import request from "supertest";
import { registerAdminAuth } from "./admin-auth";

function makeApp(store = new session.MemoryStore()) {
  const app = express();
  app.use(express.json());
  app.use(session({ store, secret: "test-session-secret", resave: false, saveUninitialized: false }));
  registerAdminAuth(app, "test-only-password");
  app.get("/protected", (req, res) => res.sendStatus(req.session.isAdmin ? 200 : 401));
  return app;
}

test("admin login persists, works on another server using the same store, and logout revokes it", async () => {
  const store = new session.MemoryStore();
  const app = makeApp(store);
  await request(app).get("/protected").expect(401);
  await request(app).post("/api/auth/login").send({ password: "wrong" }).expect(401);
  const login = await request(app).post("/api/auth/login").send({ password: "test-only-password" }).expect(200);
  const cookie = login.headers["set-cookie"];
  assert.ok(cookie);
  const secondApp = makeApp(store);
  await request(secondApp).get("/protected").set("Cookie", cookie).expect(200);
  const check = await request(secondApp).get("/api/auth/check").set("Cookie", cookie).expect(200);
  assert.equal(check.body.isAdmin, true);
  assert.equal(check.headers["cache-control"], "no-store");
  await request(secondApp).post("/api/auth/logout").set("Cookie", cookie).expect(200);
  await request(app).get("/protected").set("Cookie", cookie).expect(401);
});

test("a failed session save must never report successful login", async () => {
  const store = new session.MemoryStore();
  store.set = (_id, _session, callback) => callback?.(new Error("test storage failure"));
  const response = await request(makeApp(store)).post("/api/auth/login").send({ password: "test-only-password" }).expect(503);
  assert.equal(response.body.success, false);
});
