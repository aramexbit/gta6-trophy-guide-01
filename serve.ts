/* Leonida Legends — tiny static file server for local testing.
   Serves the app/ directory on http://localhost:8080 (or --port <n>).
   Standard library only. Paths that escape app/ are refused. */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(join(root, "app"));

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff"
};

function portFromArgs(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      const n = Number(args[i + 1]);
      if (Number.isInteger(n) && n > 0 && n < 65536) return n;
    }
    const m = args[i].match(/^--port=(\d+)$/);
    if (m) return Number(m[1]);
  }
  return 8080;
}

const port = portFromArgs();

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    const target = resolve(join(appDir, normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "")));
    if (target !== appDir && !target.startsWith(appDir + sep)) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("Forbidden\n");
      return;
    }
    if (!existsSync(target) || !statSync(target).isFile()) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found\n");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(target).toLowerCase()] ?? "application/octet-stream" });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Server error\n");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Leonida Legends serving app/ at http://localhost:" + port);
});
