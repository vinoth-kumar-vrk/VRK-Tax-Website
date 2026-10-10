// Storage layer. On Netlify it uses Netlify Blobs (free, built in).
// For local tests set LOCAL_STORE_DIR to use plain JSON files instead.
import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import path from "node:path";

function fileStore(dir, name) {
  const root = path.join(dir, name);
  const file = (key) => path.join(root, encodeURIComponent(key) + ".json");
  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(file(key), "utf8"));
      } catch {
        return null;
      }
    },
    async set(key, value) {
      await mkdir(root, { recursive: true });
      await writeFile(file(key), JSON.stringify(value));
    },
    async del(key) {
      await rm(file(key), { force: true });
    },
    async keys(prefix = "") {
      try {
        const names = await readdir(root);
        return names
          .map((n) => decodeURIComponent(n.replace(/\.json$/, "")))
          .filter((k) => k.startsWith(prefix))
          .sort();
      } catch {
        return [];
      }
    },
  };
}

function blobStore(name) {
  const s = getStore({ name, consistency: "strong" });
  return {
    get: (key) => s.get(key, { type: "json" }),
    set: (key, value) => s.setJSON(key, value),
    del: (key) => s.delete(key),
    async keys(prefix = "") {
      const { blobs } = await s.list({ prefix });
      return blobs.map((b) => b.key).sort();
    },
  };
}

export function openStore(name = "vrk") {
  return process.env.LOCAL_STORE_DIR ? fileStore(process.env.LOCAL_STORE_DIR, name) : blobStore(name);
}

/** Fixed-window rate limiter. Returns true when the call is allowed. */
export async function allow(store, bucket, id, { max, windowMs }) {
  const key = `rl/${bucket}/${id}`;
  const now = Date.now();
  let rec = await store.get(key);
  if (!rec || now - rec.start > windowMs) rec = { start: now, count: 0 };
  rec.count += 1;
  await store.set(key, rec);
  return rec.count <= max;
}
