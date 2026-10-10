// Local preview:  npm run local  ->  http://localhost:8888   (static files from ./public, no dependencies)
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain" };

http
  .createServer(async (req, res) => {
    let file = path.join(root, decodeURIComponent(new URL(req.url, "http://localhost").pathname));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { "content-type": "text/html" });
      res.end(await readFile(path.join(root, "404.html")));
    }
  })
  .listen(8888, () => console.log("VRK site: http://localhost:8888"));
