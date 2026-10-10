// POST /api/enquiry — public enquiry form endpoint.
import { randomBytes, createHash } from "node:crypto";
import { json, clientIp, sameOrigin, readBody } from "./lib/http.mjs";
import { validateEnquiry } from "./lib/validate.mjs";
import { openStore, allow } from "./lib/store.mjs";
import { notifyEnquiry } from "./lib/mail.mjs";

const MAX_PER_HOUR = 5;

export default async (req, context) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed" }, { allow: "POST" });
  if (!sameOrigin(req)) return json(403, { ok: false, error: "Forbidden" });

  let body;
  try {
    body = await readBody(req);
  } catch (err) {
    return json(err.status || 400, { ok: false, error: err.message });
  }

  // Honeypot: real visitors never fill the hidden "website" field. Pretend success to bots.
  if (body.website) return json(201, { ok: true });

  const { ok, errors, value } = validateEnquiry(body);
  if (!ok) return json(400, { ok: false, error: "Please check the highlighted fields.", errors });

  const store = openStore();
  const ip = clientIp(req, context);
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);

  if (!(await allow(store, "enquiry", ipHash, { max: MAX_PER_HOUR, windowMs: 60 * 60 * 1000 }))) {
    return json(429, { ok: false, error: "Too many enquiries from your connection. Please call or WhatsApp us on +91 90921 88514." });
  }

  // Newest-first ordering: key sorts ascending by (max - timestamp).
  const id = `${String(9999999999999 - Date.now()).padStart(13, "0")}-${randomBytes(3).toString("hex")}`;
  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...value,
    page: String(body.page || "").slice(0, 120),
    status: "new",
    note: "",
    emailed: false,
    ipHash,
  };
  await store.set(`enq/${id}`, record);

  // Email alert is best-effort: the enquiry is already saved even if it fails.
  const emailed = await notifyEnquiry(record);
  if (emailed) await store.set(`enq/${id}`, { ...record, emailed: true });

  return json(201, { ok: true, id });
};

export const config = { path: "/api/enquiry" };
