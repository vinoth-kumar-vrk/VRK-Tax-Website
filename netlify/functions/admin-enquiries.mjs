// /api/admin/enquiries[/:id] — list / export (GET), update (PATCH), delete (DELETE). Bearer-token protected.
import { json, sameOrigin, readBody } from "./lib/http.mjs";
import { verifyToken } from "./lib/auth.mjs";
import { openStore } from "./lib/store.mjs";
import { STATUSES } from "./lib/validate.mjs";

const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

export default async (req) => {
  if (!verifyToken(req)) return json(401, { ok: false, error: "Unauthorised" });
  if (req.method !== "GET" && !sameOrigin(req)) return json(403, { ok: false, error: "Forbidden" });

  const url = new URL(req.url);
  const id = decodeURIComponent(url.pathname.replace(/^\/api\/admin\/enquiries\/?/, ""));
  const store = openStore();

  if (req.method === "GET" && !id) {
    const keys = await store.keys("enq/");
    const all = (await Promise.all(keys.map((k) => store.get(k)))).filter(Boolean);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const r of all) counts[r.status] = (counts[r.status] || 0) + 1;

    const status = url.searchParams.get("status");
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const items = all.filter(
      (r) =>
        (!status || status === "all" || r.status === status) &&
        (!q || [r.name, r.phone, r.email, r.service, r.message].join(" ").toLowerCase().includes(q)),
    );

    if (url.searchParams.get("format") === "csv") {
      const head = ["Received", "Name", "Mobile", "Email", "Service", "Message", "Status", "Note", "Page"];
      const lines = [head.map(csvCell).join(",")].concat(
        items.map((r) => [r.createdAt, r.name, r.phone, r.email, r.service, r.message, r.status, r.note, r.page].map(csvCell).join(",")),
      );
      return new Response("﻿" + lines.join("\r\n"), {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="vrk-enquiries.csv"',
          "cache-control": "no-store",
        },
      });
    }
    return json(200, { ok: true, total: all.length, counts, items });
  }

  if (!id) return json(405, { ok: false, error: "Method not allowed" });
  const key = `enq/${id}`;
  const rec = await store.get(key);
  if (!rec) return json(404, { ok: false, error: "Enquiry not found" });

  if (req.method === "GET") return json(200, { ok: true, item: rec });

  if (req.method === "PATCH") {
    let body;
    try {
      body = await readBody(req, 4096);
    } catch (err) {
      return json(err.status || 400, { ok: false, error: err.message });
    }
    if (body.status !== undefined && !STATUSES.includes(body.status)) return json(400, { ok: false, error: "Invalid status" });
    const next = {
      ...rec,
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.note !== undefined ? { note: String(body.note).slice(0, 1000) } : {}),
      updatedAt: new Date().toISOString(),
    };
    await store.set(key, next);
    return json(200, { ok: true, item: next });
  }

  if (req.method === "DELETE") {
    await store.del(key);
    return json(200, { ok: true });
  }

  return json(405, { ok: false, error: "Method not allowed" });
};

export const config = { path: ["/api/admin/enquiries", "/api/admin/enquiries/*"] };
