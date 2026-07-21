import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensurePaddleOcrModels,
  findPaddleOcrWorkerPath,
  getPaddleOcrModelPath,
  paddleOcrModels,
} from "./paddleocr-assets.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const preferredPort = Number(process.env.PORT || 4173);
const responseHeaders = readCloudflareHeaders(join(root, "_headers"));
await ensurePaddleOcrModels(root);
const vendorFiles = new Map([
  ["/vendor/paddleocr/worker.js", await findPaddleOcrWorkerPath(root)],
  ...paddleOcrModels.map((model) => [
    `/vendor/paddleocr/models/${model.name}.tar`,
    getPaddleOcrModelPath(root, model),
  ]),
]);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gz", "application/gzip"],
  [".tar", "application/x-tar"],
  [".wasm", "application/wasm"],
  [".mjs", "text/javascript; charset=utf-8"],
]);

function readCloudflareHeaders(filePath) {
  if (!existsSync(filePath)) return {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const rootSection = lines.findIndex((line) => line.trim() === "/*");
  if (rootSection < 0) return {};

  const headers = {};
  for (const line of lines.slice(rootSection + 1)) {
    if (line.trim() && !/^\s/.test(line)) break;
    const value = line.trim();
    if (!value || !value.includes(":")) continue;
    const separator = value.indexOf(":");
    headers[value.slice(0, separator).trim()] = value.slice(separator + 1).trim();
  }
  return headers;
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const vendorPath = vendorFiles.get(decodedPath.replaceAll("\\", "/"));
  if (vendorPath && existsSync(vendorPath)) return vendorPath;
  const candidate = normalize(join(root, decodedPath));
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(root, "index.html");
}

function createAppServer() {
  return createServer((request, response) => {
    const filePath = resolveRequestPath(request.url || "/");
    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const contentType = mimeTypes.get(extname(filePath)) || "application/octet-stream";
    response.writeHead(200, {
      ...responseHeaders,
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    createReadStream(filePath).pipe(response);
  });
}

function listen(port) {
  const server = createAppServer();
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < preferredPort + 20) {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Survey report builder running at http://127.0.0.1:${port}/`);
  });
}

listen(preferredPort);
