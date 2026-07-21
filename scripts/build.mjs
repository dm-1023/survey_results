import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copyPaddleOcrAssets } from "./paddleocr-assets.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "cloudflare-dist");

const files = [
  "index.html",
  "_headers",
  "favicon.svg",
  "src/survey-ocr.js",
  "src/survey-scan.js",
  "src/dynamic-app.js",
  "src/styles/app.css",
  "src/styles/print.css",
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

await mkdir(dist, { recursive: true });

for (const file of files) {
  const source = join(root, file);
  if (await exists(source)) {
    const destination = join(dist, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

await copyPaddleOcrAssets(root, dist);

console.log(`Built static assets in ${dist}`);
