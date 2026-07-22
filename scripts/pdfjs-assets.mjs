import { copyFile, cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const publicFiles = Object.freeze({
  "pdf.mjs": "build/pdf.min.mjs",
  "pdf.worker.mjs": "build/pdf.worker.min.mjs",
});

const publicDirectories = new Set([
  "cmaps",
  "iccs",
  "image_decoders",
  "standard_fonts",
  "wasm",
]);

function getPackageDirectory(root) {
  return join(root, "node_modules", "pdfjs-dist");
}

export function getPdfJsAssetPath(root, relativePath) {
  const normalized = String(relativePath || "").replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").includes("..")) return null;
  const mappedFile = publicFiles[normalized];
  if (mappedFile) return join(getPackageDirectory(root), ...mappedFile.split("/"));
  const [directory, ...parts] = normalized.split("/");
  if (!publicDirectories.has(directory) || !parts.length) return null;
  return join(getPackageDirectory(root), directory, ...parts);
}

export async function copyPdfJsAssets(root, outputDirectory) {
  const destinationRoot = join(outputDirectory, "vendor", "pdfjs");
  for (const [publicName, packagePath] of Object.entries(publicFiles)) {
    const destination = join(destinationRoot, publicName);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(getPackageDirectory(root), ...packagePath.split("/")), destination);
  }
  for (const directory of publicDirectories) {
    await cp(join(getPackageDirectory(root), directory), join(destinationRoot, directory), { recursive: true });
  }
}
