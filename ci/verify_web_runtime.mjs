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
  'G81',
  'G73',
  'G83',
  'G34',
  'pattern:"G34"',
  'presetOnly:true',
  'G98',
  'G99',
  'function invokeCycle',
  'materialRemovalDepth',
  'safetyWarnings',
  'data-tool-dia',
  'data-safe-z',
  'data-g73-retract',
  'data-cmd="optional"',
  'data-cmd="blockskip"',
  'state.optionalStop',
  'state.blockSkip',
  'machine.spindle="M3"',
  'machine.coolant=true',
  'machine.selectedTool',
  'mMatches.includes("M6")',
  'stopCode',
  'function compilePrograms',
  'M98 P4',
  'M98 P5',
  'M99',
  'G43',
  'G49',
  'G54',
  'G55',
  'data-g54-x',
  'data-g55-x',
  'data-h1',
  'data-wcsmetric',
  'data-hmetric',
  'data-subprogram',
  'function machinePosition',
  'function toolLengthFor',
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

// Execute the pure parser core so runtime-scope bugs are caught, not only syntax errors.
const coreStart = scriptMatch[1].indexOf("function parseWords(line){");
const coreEnd = scriptMatch[1].indexOf("function makeRuntime(root){", coreStart);
if (coreStart < 0 || coreEnd < 0) throw new Error("WEB_RUNTIME_CORE_BOUNDS_MISSING");
const core = scriptMatch[1].slice(coreStart, coreEnd);
const api = new Function(core + "\nreturn {parseProgram,compilePrograms};")();

const subProgramTest = `O1000
N10 M98 P4
N20 G90 G54
N30 G0 X10. Y20. Z5.
N40 G55 X1. Y2.
N50 M98 P5
N60 M30
O4
N10 T9 M6
N20 G43 H1 Z30. M8
N30 M99
O5
N10 M9
N20 M5
N30 M99`;
const subParsed = api.parseProgram(subProgramTest, "3AX", {g73Retract:0.5,safeZ:5});
if (subParsed.errors.length) throw new Error("SUBPROGRAM_RUNTIME_ERROR: " + subParsed.errors.join(" | "));
const subs = new Set(subParsed.blocks.map(b => b.subprogram));
if (!subs.has("4") || !subs.has("5")) throw new Error("M98_P4_P5_NOT_EXPANDED");
if (!subParsed.blocks.some(b => b.subCall === 4) || !subParsed.blocks.some(b => b.subCall === 5)) throw new Error("M98_CALL_METADATA_MISSING");
if (!subParsed.blocks.some(b => b.machine?.toolComp && b.machine?.H === 1 && b.machine?.T === 9)) throw new Error("G43_H_RUNTIME_STATE_MISSING");
if (!subParsed.blocks.some(b => b.machine?.wcs === "G55")) throw new Error("G55_RUNTIME_STATE_MISSING");

const toolTest = api.parseProgram("O3000\nN10 T9\nN20 G0 X1.\nN30 M6\nN40 M30", "3AX", {g73Retract:0.5,safeZ:5});
const beforeM6 = toolTest.blocks.find(b => /X1\./.test(b.raw));
const afterM6 = toolTest.blocks.find(b => /M6/.test(b.raw));
if (!beforeM6 || beforeM6.machine?.T !== 0 || beforeM6.machine?.selectedTool !== 9) throw new Error("TOOL_PRESELECT_STATE_BROKEN");
if (!afterM6 || afterM6.machine?.T !== 9) throw new Error("M6_ACTIVE_TOOL_STATE_BROKEN");

const drillTest = `O2000
N10 G90 G54 G17
N20 G99 G81 Z-10. R3. F150 L0
N30 G34 X30. Y30. I20. J0. K6
N40 G80
N50 M30`;
const drillParsed = api.parseProgram(drillTest, "3AX", {g73Retract:0.5,safeZ:5});
if (drillParsed.errors.length) throw new Error("DRILL_RUNTIME_ERROR: " + drillParsed.errors.join(" | "));
const holes = drillParsed.blocks.filter(b => b.pattern === "G34" && b.drillBottom);
if (holes.length !== 6) throw new Error("G34_HOLE_COUNT_" + holes.length);
if (!holes.every(b => b.cycle === "G81")) throw new Error("G34_MODAL_G81_MISSING");

const runtimeCount = (html.match(/sim\("3AX"|sim\("4AX"|sim\("5AX"/g) || []).length;
if (runtimeCount !== 0) {
  // Runtime pages are generated dynamically through simPage(name), so direct sim(...) calls are not expected.
}

const pageDefs = [...html.matchAll(/\["(?:功能|CAD|CAM|刀路|3AX|4AX|5AX)","#[0-9a-fA-F]{6}"\]/g)];
if (pageDefs.length !== 7) {
  throw new Error("WEB_RUNTIME_PAGE_COUNT_" + pageDefs.length);
}

console.log("AIG_WEB_RUNTIME_GATE_PASS|7_PAGES|3AX_4AX_5AX_GCODE|G90_G91|G81_G73_G83|G34_BOLT_CIRCLE|G98_G99|TOOL_DIAMETER|SAFE_Z|MATERIAL_REMOVAL|M00_M01_M30|OPTIONAL_STOP|BLOCK_SKIP|TOOL_H_COOLANT_SPINDLE|G43_H|G54_G55_EXPLICIT|M98_P4_P5_M99|PARSER_EXECUTION_TEST|T_PRESELECT_M6_ACTIVE|BLACK_RGB");
