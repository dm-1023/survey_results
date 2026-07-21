import { copyFile, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const paddleOcrModels = Object.freeze([
  {
    name: "PP-OCRv6_small_det",
    url: "https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv6_small_det_onnx_infer.tar",
  },
  {
    name: "PP-OCRv6_small_rec",
    url: "https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/PP-OCRv6_small_rec_onnx_infer.tar",
  },
]);

export function getPaddleOcrCacheDirectory(root) {
  return join(root, ".cache", "paddleocr");
}

export function getPaddleOcrModelPath(root, model) {
  return join(getPaddleOcrCacheDirectory(root), `${model.name}.tar`);
}

export async function findPaddleOcrWorkerPath(root) {
  const assetsDirectory = join(root, "node_modules", "@paddleocr", "paddleocr-js", "dist", "assets");
  const entries = await readdir(assetsDirectory);
  const workerFile = entries.find((entry) => /^worker-entry-.*\.js$/.test(entry));
  if (!workerFile) throw new Error("PaddleOCR worker asset was not found.");
  return join(assetsDirectory, workerFile);
}

export async function ensurePaddleOcrModels(root) {
  const cacheDirectory = getPaddleOcrCacheDirectory(root);
  await mkdir(cacheDirectory, { recursive: true });
  for (const model of paddleOcrModels) {
    const destination = getPaddleOcrModelPath(root, model);
    if (await isUsableFile(destination)) continue;
    const temporary = `${destination}.download`;
    await rm(temporary, { force: true });
    console.log(`Downloading PaddleOCR model: ${model.name}`);
    const response = await fetch(model.url);
    if (!response.ok) throw new Error(`Failed to download ${model.name}: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 1024 * 1024) throw new Error(`Downloaded ${model.name} is unexpectedly small.`);
    await writeFile(temporary, bytes);
    await rename(temporary, destination);
  }
}

export async function copyPaddleOcrAssets(root, outputDirectory) {
  await ensurePaddleOcrModels(root);
  const workerSource = await findPaddleOcrWorkerPath(root);
  const workerDestination = join(outputDirectory, "vendor", "paddleocr", "worker.js");
  await mkdir(dirname(workerDestination), { recursive: true });
  await copyFile(workerSource, workerDestination);
  for (const model of paddleOcrModels) {
    const destination = join(outputDirectory, "vendor", "paddleocr", "models", `${model.name}.tar`);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(getPaddleOcrModelPath(root, model), destination);
  }
}

async function isUsableFile(path) {
  try {
    return (await stat(path)).size >= 1024 * 1024;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
