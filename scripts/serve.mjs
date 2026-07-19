import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const preferredPort = Number(process.env.PORT || 4173);
const responseHeaders = readCloudflareHeaders(join(root, "_headers"));
const vendorFiles = new Map([
  ["/vendor/tesseract/tesseract.min.js", join(root, "node_modules/tesseract.js/dist/tesseract.min.js")],
  ["/vendor/tesseract/worker.min.js", join(root, "node_modules/tesseract.js/dist/worker.min.js")],
  ["/vendor/tesseract-core/tesseract-core-lstm.wasm.js", join(root, "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js")],
  ["/vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js", join(root, "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js")],
  ["/vendor/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js", join(root, "node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js")],
  ["/vendor/tessdata/jpn.traineddata.gz", join(root, "node_modules/@tesseract.js-data/jpn/4.0.0_best_int/jpn.traineddata.gz")],
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
]);

function readCloudflareHeaders(filePath) {
  if (!existsSync(filePath)) return {};
  return Object.fromEntries(readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== "/*" && line.includes(":"))
    .map((line) => {
      const separator = line.indexOf(":");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }));
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
