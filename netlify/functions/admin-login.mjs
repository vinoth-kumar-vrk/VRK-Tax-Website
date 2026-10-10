// POST /api/admin/login — exchange the admin password for a 12-hour bearer token.
import { createHash } from "node:crypto";
import { json, clientIp, sameOrigin, readBody } from "./lib/http.mjs";
import { adminConfigured, passwordOk, issueToken } from "./lib/auth.mjs";
import { openStore, allow } from "./lib/store.mjs";

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" }, { allow: "POST" });
  if (!sameOrigin(req)) return json(403, { ok: false, error: "Forbidden" });
  if (!adminConfigured()) return json(503, { ok: false, error: "Admin is not configured. Set ADMIN_PASSWORD in Netlify environment variables." });

  const ipHash = createHash("sha256").update(clientIp(req, context)).digest("hex").slice(0, 16);
  // Brute-force guard: 8 attempts per 15 minutes per IP.
  if (!(await allow(openStore(), "login", ipHash, { max: 8, windowMs: 15 * 60 * 1000 }))) {
    return json(429, { ok: false, error: "Too many attempts. Try again in 15 minutes." });
  }

  let body;
  try {
    body = await readBody(req, 2048);
  } catch (err) {
    return json(err.status || 400, { ok: false, error: err.message });
  }
  if (!passwordOk(body.password ?? "")) return json(401, { ok: false, error: "Incorrect password." });

  const { token, expiresAt } = issueToken();
  return json(200, { ok: true, token, expiresAt });
};

export const config = { path: "/api/admin/login" };
