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
import { getPdfJsAssetPath } from "./pdfjs-assets.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const preferredPort = Number(process.env.PORT || 4173);
const headerRules = readCloudflareHeaderRules(join(root, "_headers"));
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

function readCloudflareHeaderRules(filePath) {
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const rules = [];
  let currentRule = null;
  for (const line of lines) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      currentRule = { pattern: value, operations: [] };
      rules.push(currentRule);
      continue;
    }
    if (!currentRule) continue;
    if (value.startsWith("! ")) {
      currentRule.operations.push({ name: value.slice(2).trim(), value: null });
      continue;
    }
    const separator = value.indexOf(":");
    if (separator < 1) continue;
    currentRule.operations.push({
      name: value.slice(0, separator).trim(),
      value: value.slice(separator + 1).trim(),
    });
  }
  return rules;
}

function getCloudflareHeaders(urlPath) {
  const headers = {};
  for (const rule of headerRules) {
    if (!matchesHeaderPattern(rule.pattern, urlPath)) continue;
    for (const operation of rule.operations) {
      if (operation.value === null) {
        delete headers[operation.name];
      } else if (headers[operation.name]) {
        headers[operation.name] = `${headers[operation.name]}, ${operation.value}`;
      } else {
        headers[operation.name] = operation.value;
      }
    }
  }
  return headers;
}

function matchesHeaderPattern(pattern, urlPath) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace("*", ".*");
  return new RegExp(`^${escaped}$`).test(urlPath);
}

function resolveRequestPath(urlPath) {
  const vendorPath = vendorFiles.get(urlPath);
  if (vendorPath && existsSync(vendorPath)) return vendorPath;
  if (urlPath.startsWith("/vendor/pdfjs/")) {
    const pdfJsPath = getPdfJsAssetPath(root, urlPath.slice("/vendor/pdfjs/".length));
    if (pdfJsPath && existsSync(pdfJsPath) && statSync(pdfJsPath).isFile()) return pdfJsPath;
  }
  const candidate = normalize(join(root, urlPath));
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return join(root, "index.html");
}

function createAppServer() {
  return createServer((request, response) => {
    const urlPath = decodeURIComponent((request.url || "/").split("?")[0]).replaceAll("\\", "/");
    const filePath = resolveRequestPath(urlPath);
    if (!filePath || !existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const contentType = mimeTypes.get(extname(filePath)) || "application/octet-stream";
    response.writeHead(200, {
      ...getCloudflareHeaders(urlPath),
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
