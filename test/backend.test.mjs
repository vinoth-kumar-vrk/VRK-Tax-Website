import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(tmpdir(), "vrk-"));
process.env.LOCAL_STORE_DIR = dir;
process.env.ADMIN_PASSWORD = "test-password-123";
delete process.env.RESEND_API_KEY;

const { default: enquiry } = await import("../netlify/functions/enquiry.mjs");
const { default: login } = await import("../netlify/functions/admin-login.mjs");
const { default: admin } = await import("../netlify/functions/admin-enquiries.mjs");
const { normalisePhone, validateEnquiry } = await import("../netlify/functions/lib/validate.mjs");

const BASE = "https://site.test";
const post = (p, body, headers = {}, ip = "1.1.1.1") =>
  new Request(BASE + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const ctx = (ip = "1.1.1.1") => ({ ip });
const good = { name: "Ravi Kumar", phone: "98765 43210", email: "ravi@example.com", service: "GST Services", message: "Need GST filing", page: "/service-gst.html" };

test.after(() => rmSync(dir, { recursive: true, force: true }));

test("phone normalisation", () => {
  assert.equal(normalisePhone("98765 43210"), "+919876543210");
  assert.equal(normalisePhone("+91 98765-43210"), "+919876543210");
  assert.equal(normalisePhone("09876543210"), "+919876543210");
  assert.equal(normalisePhone("12345"), null);
  assert.equal(normalisePhone("5876543210"), null);
});

test("validation rejects bad input and accepts good input", () => {
  assert.equal(validateEnquiry({}).ok, false);
  assert.deepEqual(Object.keys(validateEnquiry({ name: "A", phone: "1", email: "x", service: "Hack" }).errors).sort(), ["email", "name", "phone", "service"]);
  assert.equal(validateEnquiry(good).ok, true);
});

test("enquiry: only POST allowed", async () => {
  const res = await enquiry(new Request(BASE + "/api/enquiry"), ctx());
  assert.equal(res.status, 405);
});

test("enquiry: cross-origin post is blocked", async () => {
  const res = await enquiry(post("/api/enquiry", good, { origin: "https://evil.example" }), ctx("2.2.2.2"));
  assert.equal(res.status, 403);
});

test("enquiry: invalid data returns field errors", async () => {
  const res = await enquiry(post("/api/enquiry", { name: "", phone: "abc" }), ctx("3.3.3.3"));
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.ok(data.errors.name && data.errors.phone);
});

test("enquiry: honeypot fakes success and stores nothing", async () => {
  const res = await enquiry(post("/api/enquiry", { ...good, website: "http://spam" }), ctx("4.4.4.4"));
  assert.equal(res.status, 201);
});

test("enquiry: valid submission is saved", async () => {
  const res = await enquiry(post("/api/enquiry", good, { origin: BASE }), ctx("5.5.5.5"));
  const data = await res.json();
  assert.equal(res.status, 201);
  assert.ok(data.ok && data.id);
});

test("enquiry: rate limit kicks in after 5 per hour", async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await enquiry(post("/api/enquiry", good), ctx("9.9.9.9"));
  assert.equal(last.status, 429);
});

test("admin: endpoints require a token", async () => {
  assert.equal((await admin(new Request(BASE + "/api/admin/enquiries"))).status, 401);
  const bad = new Request(BASE + "/api/admin/enquiries", { headers: { authorization: "Bearer abc.def" } });
  assert.equal((await admin(bad)).status, 401);
});

test("admin: wrong password rejected, right password works, full lifecycle", async () => {
  assert.equal((await login(post("/api/admin/login", { password: "nope" }), ctx("7.7.7.7"))).status, 401);
  const ok = await login(post("/api/admin/login", { password: "test-password-123" }), ctx("7.7.7.7"));
  assert.equal(ok.status, 200);
  const { token } = await ok.json();
  const auth = { authorization: `Bearer ${token}` };

  // list (5.5.5.5 saved 1, 9.9.9.9 saved 5 => 6 total)
  const list = await (await admin(new Request(BASE + "/api/admin/enquiries", { headers: auth }))).json();
  assert.equal(list.total, 6);
  assert.equal(list.counts.new, 6);
  const rec = list.items.find((r) => r.name === "Ravi Kumar");
  assert.equal(rec.phone, "+919876543210");

  // search
  const s = await (await admin(new Request(BASE + "/api/admin/enquiries?q=nomatch", { headers: auth }))).json();
  assert.equal(s.items.length, 0);

  // update
  const patch = await admin(new Request(BASE + `/api/admin/enquiries/${rec.id}`, { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ status: "contacted", note: "Called back" }) }));
  assert.equal(patch.status, 200);
  assert.equal((await patch.json()).item.status, "contacted");
  const bad = await admin(new Request(BASE + `/api/admin/enquiries/${rec.id}`, { method: "PATCH", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ status: "bogus" }) }));
  assert.equal(bad.status, 400);

  // csv
  const csv = await admin(new Request(BASE + "/api/admin/enquiries?format=csv&status=contacted", { headers: auth }));
  assert.match(csv.headers.get("content-type"), /text\/csv/);
  const text = await csv.text();
  assert.match(text, /Ravi Kumar/);
  assert.match(text, /Called back/);

  // delete
  assert.equal((await admin(new Request(BASE + `/api/admin/enquiries/${rec.id}`, { method: "DELETE", headers: auth }))).status, 200);
  assert.equal((await admin(new Request(BASE + `/api/admin/enquiries/${rec.id}`, { headers: auth }))).status, 404);
});

test("admin: expired token is rejected", async () => {
  const { issueToken, verifyToken } = await import("../netlify/functions/lib/auth.mjs");
  const { token } = issueToken(Date.now() - 13 * 60 * 60 * 1000);
  const req = new Request(BASE + "/x", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(verifyToken(req), false);
});

test("admin login: brute force is throttled", async () => {
  let last;
  for (let i = 0; i < 9; i++) last = await login(post("/api/admin/login", { password: "x" }), ctx("8.8.8.8"));
  assert.equal(last.status, 429);
});
