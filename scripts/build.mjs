import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const vendorFiles = [
  ["node_modules/tesseract.js/dist/tesseract.min.js", "vendor/tesseract/tesseract.min.js"],
  ["node_modules/tesseract.js/dist/worker.min.js", "vendor/tesseract/worker.min.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "vendor/tesseract-core/tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "vendor/tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/jpn/4.0.0_best_int/jpn.traineddata.gz", "vendor/tessdata/jpn.traineddata.gz"],
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

for (const [sourceFile, destinationFile] of vendorFiles) {
  const source = join(root, sourceFile);
  if (!(await exists(source))) throw new Error(`Required OCR asset is missing: ${sourceFile}`);
  const destination = join(dist, destinationFile);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

console.log(`Built static assets in ${dist}`);
