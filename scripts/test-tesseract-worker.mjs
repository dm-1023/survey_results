import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const messages = [];
const importedScripts = [];
const consoleMock = Object.fromEntries(["log", "warn", "error"].map((method) => [method, (...args) => {
  messages.push({ method, args });
}]));
const context = {
  URL,
  console: consoleMock,
  self: {
    location: { href: "http://127.0.0.1:4173/src/tesseract-worker.js" },
    importScripts(url) {
      importedScripts.push(url);
    },
  },
};

const source = await readFile(new URL("../src/tesseract-worker.js", import.meta.url), "utf8");
vm.runInNewContext(source, context);

context.console.error("Warning: Parameter not found: language_model_ngram_on");
context.console.warn("確認用の警告");

assert.deepEqual(importedScripts, ["http://127.0.0.1:4173/vendor/tesseract/worker.min.js"]);
assert.equal(messages.length, 1);
assert.equal(messages[0].method, "warn");
assert.equal(messages[0].args[0], "確認用の警告");

console.log("Tesseract worker tests passed");
