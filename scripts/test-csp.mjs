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
assert.match(headers, /script-src 'self' 'wasm-unsafe-eval'/, "OCR WebAssembly must be allowed without enabling general unsafe eval");
assert.match(headers, /worker-src 'self'/, "OCR workers must be restricted to this site");
assert.equal(headers.includes("'unsafe-inline'"), false, "CSP must not allow inline scripts or styles");

console.log("CSP source tests passed");
