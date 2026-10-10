// Local preview without the Netlify CLI:  npm run local   ->  http://localhost:8888
// Serves /public and routes /api/* to the same function handlers Netlify runs. Data is stored in ./.data
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
process.env.LOCAL_STORE_DIR ||= path.join(root, ".data");
process.env.ADMIN_PASSWORD ||= "admin123"; // local only

const routes = [
  ["/api/enquiry", (await import("./netlify/functions/enquiry.mjs")).default, true],
  ["/api/admin/login", (await import("./netlify/functions/admin-login.mjs")).default, true],
  ["/api/admin/enquiries", (await import("./netlify/functions/admin-enquiries.mjs")).default, false],
];
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain" };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost:8888");
    const route = routes.find(([p, , exact]) => (exact ? url.pathname === p : url.pathname === p || url.pathname.startsWith(p + "/")));
    if (route) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const r = await route[1](new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }), { ip: req.socket.remoteAddress });
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let file = path.join(root, "public", decodeURIComponent(url.pathname));
    if (!file.startsWith(path.join(root, "public"))) { res.writeHead(403); return res.end(); }
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { "content-type": "text/html" });
      res.end(await readFile(path.join(root, "public", "404.html")));
    }
  })
  .listen(8888, () => console.log("VRK site: http://localhost:8888   admin: /admin/  (password: " + process.env.ADMIN_PASSWORD + ")"));
