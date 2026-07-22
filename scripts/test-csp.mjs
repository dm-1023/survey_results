import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const deployedSources = ["index.html", "src/survey-ocr.js", "src/survey-scan.js", "src/dynamic-app.js"];
const forbiddenInlineStylePatterns = [
  { label: "style element", pattern: /<style\b/i },
  { label: "style attribute", pattern: /\bstyle\s*=\s*["']/i },
  { label: "element.style assignment", pattern: /\.style(?:\.|\s*=(?!=))/ },
  { label: "style attribute assignment", pattern: /setAttribute\(\s*["']style["']/i },
  { label: "dynamic style element", pattern: /createElement\(\s*["']style["']/i },
];

for (const sourcePath of deployedSources) {
  const source = await readFile(sourcePath, "utf8");
  for (const { label, pattern } of forbiddenInlineStylePatterns) {
    assert.equal(pattern.test(source), false, `${sourcePath} contains a CSP-incompatible ${label}`);
  }
}

const headers = await readFile("_headers", "utf8");
const rootPolicy = headers.match(/^\/\*\s+[\s\S]*?^\s+Content-Security-Policy:\s*([^\r\n]+)/m)?.[1] || "";
const workerPolicy = headers.match(/^\/vendor\/paddleocr\/worker\.js\s+[\s\S]*?^\s+Content-Security-Policy:\s*([^\r\n]+)/m)?.[1] || "";
const pdfWorkerPolicy = headers.match(/^\/vendor\/pdfjs\/pdf\.worker\.mjs\s+[\s\S]*?^\s+Content-Security-Policy:\s*([^\r\n]+)/m)?.[1] || "";
assert.match(rootPolicy, /script-src 'self';/, "The page must execute scripts from this site only");
assert.equal(/(?:^|\s)'unsafe-eval'(?:\s|$)/.test(rootPolicy), false, "The page policy must not enable general unsafe eval");
assert.equal(rootPolicy.includes("'wasm-unsafe-eval'"), false, "The page policy must not allow WebAssembly compilation outside the OCR worker");
assert.match(headers, /worker-src 'self'/, "OCR workers must be restricted to this site");
assert.match(headers, /\/vendor\/paddleocr\/worker\.js\s+[\s\S]*?! Content-Security-Policy/m, "The page policy must be detached from the PaddleOCR worker response");
assert.match(workerPolicy, /script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'/, "Only the PaddleOCR worker may evaluate its trusted runtime code and load the pinned runtime blob");
assert.match(workerPolicy, /script-src[^\n]+https:\/\/cdn\.jsdelivr\.net/, "The worker must be allowed to load the pinned ONNX runtime module");
assert.match(workerPolicy, /connect-src 'self' data: https:\/\/cdn\.jsdelivr\.net/, "The worker must be allowed to load embedded OpenCV WASM and pinned ONNX assets");
assert.match(workerPolicy, /connect-src[^\n]+https:\/\/cdn\.jsdelivr\.net/, "The worker must be allowed to download the pinned ONNX runtime assets");
assert.match(headers, /\/vendor\/paddleocr\/\*\s+[\s\S]*?! Cache-Control\s+[\s\S]*?Cache-Control: public, max-age=31536000, immutable/m, "Large PaddleOCR assets must replace the page no-store policy with immutable caching");
assert.match(headers, /\/vendor\/pdfjs\/\*\s+[\s\S]*?! Cache-Control\s+[\s\S]*?Cache-Control: public, max-age=31536000, immutable/m, "PDF.js assets must replace the page no-store policy with immutable caching");
assert.match(headers, /\/vendor\/pdfjs\/pdf\.worker\.mjs\s+[\s\S]*?! Content-Security-Policy/m, "The page policy must be detached from the PDF.js worker response");
assert.match(pdfWorkerPolicy, /script-src 'self' blob: 'wasm-unsafe-eval'/, "The PDF.js worker must be allowed to decode PDF images with its trusted WASM modules");
assert.equal(/(?:^|\s)'unsafe-eval'(?:\s|$)/.test(pdfWorkerPolicy), false, "The PDF.js worker must not enable general unsafe eval");
assert.equal(headers.includes("'unsafe-inline'"), false, "CSP must not allow inline scripts or styles");

console.log("CSP source tests passed");
