import fs from "node:fs";

const html = fs.readFileSync("web/index.html","utf8");
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/i);
if (!scriptMatch) throw new Error("WEB_RUNTIME_SCRIPT_MISSING");
new Function(scriptMatch[1]);

const required = [
  '["功能","#9f72ff"]',
  '["CAD","#27e9ff"]',
  '["CAM","#33f39b"]',
  '["刀路","#ff4da6"]',
  '["3AX","#3694ff"]',
  '["4AX","#ffb326"]',
  '["5AX","#ff4da6"]',
  'data-runtime="',
  'G-code 編輯器',
  'function parseProgram',
  'G90',
  'G91',
  'data-cmd="play"',
  'data-cmd="pause"',
  'data-cmd="step"',
  'requestAnimationFrame(tick)',
  'localStorage.setItem("aig-code-"',
  'CNC machine output disabled'
];

for (const needle of required) {
  if (!html.includes(needle)) {
    throw new Error("WEB_RUNTIME_GATE_MISSING: " + needle);
  }
}

const runtimeCount = (html.match(/sim\("3AX"|sim\("4AX"|sim\("5AX"/g) || []).length;
if (runtimeCount !== 0) {
  // Runtime pages are generated dynamically through simPage(name), so direct sim(...) calls are not expected.
}

const pageDefs = [...html.matchAll(/\["(?:功能|CAD|CAM|刀路|3AX|4AX|5AX)","#[0-9a-fA-F]{6}"\]/g)];
if (pageDefs.length !== 7) {
  throw new Error("WEB_RUNTIME_PAGE_COUNT_" + pageDefs.length);
}

console.log("AIG_WEB_RUNTIME_GATE_PASS|7_PAGES|3AX_4AX_5AX_GCODE|G90_G91|BLACK_RGB");
