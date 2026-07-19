import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/dynamic-app.js", "utf8");
const configStart = source.indexOf("const TOUR_STEPS");
const configEnd = source.indexOf("let root", configStart);
assert.ok(configStart >= 0 && configEnd > configStart, "Tutorial configuration was not found");

const config = source.slice(configStart, configEnd);
const targets = new Set(Array.from(config.matchAll(/target:\s*"([^"]+)"/g), (match) => match[1]));
const renderedTargets = new Set(Array.from(source.matchAll(/tourAttr\("([^"]+)"\)/g), (match) => match[1]));
const missingTargets = Array.from(targets).filter((target) => !renderedTargets.has(target));

assert.deepEqual(missingTargets, [], `Tutorial targets are not rendered: ${missingTargets.join(", ")}`);
console.log(`Tutorial target tests passed (${targets.size} targets)`);
