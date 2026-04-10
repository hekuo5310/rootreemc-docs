import { promises as fs, watch } from "node:fs";
import http from "node:http";
import path from "node:path";
import { buildSite } from "./build-site.mjs";
import { proxyTranslateRequest } from "./translate-proxy.mjs";

const MIME_BY_EXT = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

export async function watchAndServe(rootDir, options = {}) {
  const port = Number(options.port || 4173);
  const config = await buildSite(rootDir);
  let outDir = config.outDir;
  let rebuildTimer = null;
  let rebuilding = false;

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);
      if (requestUrl.pathname === "/api/translate") {
        await handleTranslateProxy(req, res);
        return;
      }

      const safePath = resolveRequestPath(outDir, requestUrl.pathname);
      if (!safePath) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Bad request");
        return;
      }

      const filePath = await findServedFile(outDir, safePath);
      if (!filePath) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      const fileBuffer = await fs.readFile(filePath);
      const extension = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": MIME_BY_EXT[extension] || "application/octet-stream"
      });
      res.end(fileBuffer);
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(error instanceof Error ? error.message : String(error));
    }
  });

  server.listen(port, () => {
    console.log(`Docs dev server running at http://localhost:${port}`);
  });

  const watchTargets = [
    path.join(rootDir, "docs"),
    path.join(rootDir, "public"),
    path.join(rootDir, "src"),
    path.join(rootDir, "docs.config.mjs")
  ];

  for (const watchTarget of watchTargets) {
    watchPath(watchTarget, () => {
      if (rebuilding) return;
      if (rebuildTimer) clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(async () => {
        rebuilding = true;
        try {
          const result = await buildSite(rootDir);
          outDir = result.outDir;
          console.log(`Rebuilt: ${result.pageCount} pages`);
        } catch (error) {
          console.error("Rebuild failed", error);
        } finally {
          rebuilding = false;
        }
      }, 120);
    });
  }
}

function watchPath(target, callback) {
  fs.access(target)
    .then(() => {
      const watcher = watch(target, { recursive: true }, callback);
      watcher.on("error", () => {});
    })
    .catch(() => {});
}

function resolveRequestPath(outDir, pathname) {
  const cleaned = decodeURIComponent(pathname).replace(/^\/+/u, "");
  const resolved = path.resolve(outDir, cleaned);
  const safeRoot = path.resolve(outDir);
  const relative = path.relative(safeRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

async function findServedFile(outDir, candidatePath) {
  const candidates = [];
  candidates.push(candidatePath);

  if (!path.extname(candidatePath)) {
    candidates.push(path.join(candidatePath, "index.html"));
  }

  if (candidatePath === outDir) {
    candidates.push(path.join(outDir, "index.html"));
  }

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function handleTranslateProxy(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ code: 405, message: "Method Not Allowed" }));
    return;
  }

  const rawBody = await readRequestBody(req);
  const parsedBody = parseJsonSafely(rawBody);
  const result = await proxyTranslateRequest(parsedBody);

  res.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(result.payload));
}

function readRequestBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => resolve(raw));
    req.on("error", () => resolve(""));
  });
}

function parseJsonSafely(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
