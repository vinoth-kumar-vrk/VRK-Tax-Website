// Stateless admin auth: password -> signed, expiring bearer token (HMAC-SHA256).
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const b64 = (buf) => Buffer.from(buf).toString("base64url");
const secret = () => process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

const digest = (s) => createHash("sha256").update(String(s)).digest();

export function passwordOk(input) {
  if (!adminConfigured()) return false;
  return timingSafeEqual(digest(input), digest(process.env.ADMIN_PASSWORD));
}

const sign = (payload) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function issueToken(now = Date.now()) {
  const payload = b64(JSON.stringify({ exp: now + TTL_MS }));
  return { token: `${payload}.${sign(payload)}`, expiresAt: now + TTL_MS };
}

export function verifyToken(req, now = Date.now()) {
  if (!adminConfigured()) return false;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > now;
  } catch {
    return false;
  }
}
