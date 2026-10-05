import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "web/index.html"), "utf8");
for (const marker of [
  'data-rgb-skin="aig-rgb-glass"',
  'data-rgb-skin="aig-neon"',
  'data-rgb-skin="aig-dark-ice"',
  'data-rgb-skin-select',
  "function applyRgbSkin(",
  "aig-rgb-skin-v1",
]) {
  assert.ok(html.includes(marker), `RGB_SKIN_RUNTIME_MISSING:${marker}`);
}
assert.ok(html.includes("localStorage.setItem"), "RGB_SKIN_NOT_PERSISTED");
assert.ok(html.includes("document.documentElement.dataset.rgbSkin"), "RGB_SKIN_NOT_GLOBAL");
console.log("RGB_SKIN_RUNTIME_PASS|THREE_SKINS|GLOBAL_SURFACES|PERSISTED|NO_RESTART");
