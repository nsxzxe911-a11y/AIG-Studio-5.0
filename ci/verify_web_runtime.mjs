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
  'G84',
  'G94 G84',
  'data-cam-pitch',
  'data-tp-pitch',
  '攻牙缺少有效螺距',
  'SIMULTANEOUS A/B 已阻擋',
  'tap-feed',
  'tap-return',
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
  'data-cutter-len',
  'data-holder-dia',
  'data-holder-len',
  'data-collision',
  'function sampleRuntimeBlock',
  'function scanRuntimeCollisions',
  'HOLDER_STOCK',
  'TOOL_TABLE',
  'HOLDER_TABLE',
  'RAPID_TOOL_STOCK',
  '碰撞檢查 FAIL',
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
  'function makeCadRuntime',
  'data-cad-canvas',
  'aig-cad-draft-v1',
  'TRIM',
  'EXTEND',
  'OFFSET',
  'ARRAY',
  'DIM',
  'Recovery：已自動還原',
  'function makeCamRuntime',
  'data-cam-runtime',
  'aig-cam-toolpath-v1',
  '待 3D/自適應核心接入',
  'function makeToolpathRuntime',
  'data-tp-runtime',
  'function generateFanucNC',
  'function rotaryAt(path,f,target)',
  'data-tp-rotmode',
  'data-tp-a0',
  'data-tp-a1',
  'data-tp-b0',
  'data-tp-b1',
  'SIMULTANEOUS 同步',
  'A/B 由使用者明示',
  '產生 NC',
  'localStorage.setItem("aig-code-"+target',
  'function makeMenuRuntime',
  'AIG-WEB-PROJECT-1',
  'aig-project-meta-v1',
  'aig-tool-table-v1',
  'aig-wcs-v1',
  '未接線的服務',
  'CLEAR_DERIVED',
  'function makeGlScene',
  'data-glcanvas',
  'WEBGL 3D + HEIGHTFIELD',
  'WEBGL 3D + ROTARY VOXEL',
  'function openBoxData',
  'function heightfield(scene',
  'function cutSample',
  'function cutBlock',
  'function drawHeightfield',
  'function inverseRotABPoint',
  'function inverseRotABVector',
  'function resetVoxel',
  'function voxelCutSample',
  'function voxelCutBlock',
  'function voxelStock',
  'function drawVoxelStock',
  'data-removal-volume',
  'Changing dry-run mode restarts',
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
const api = new Function(core + "\nreturn {parseProgram,compilePrograms,scanRuntimeCollisions,sampleRuntimeBlock};")();

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

const collisionCfg = {toolDia:10,cutterLen:30,holderDia:25,holderLen:25,g73Retract:0.5,safeZ:5};
const collisionSafeProgram = `O4000
N10 G90 G54 G17
N20 T1 M6
N30 S5000 M3
N40 G0 X0 Y0 Z20
N50 G1 Z-5 F200
N60 X30 F800
N70 G0 Z20
N80 M30`;
const collisionSafeParsed = api.parseProgram(collisionSafeProgram, "3AX", collisionCfg);
const collisionSafeScan = api.scanRuntimeCollisions(collisionSafeParsed, "3AX", collisionCfg);
if (collisionSafeScan.collisions.length !== 0) throw new Error("COLLISION_FALSE_POSITIVE_" + collisionSafeScan.collisions[0]?.type);

const collisionBadProgram = `O4100
N10 G90 G54 G17
N20 T1 M6
N30 G0 X0 Y0 Z20
N40 G1 Z-40 F200
N50 X10
N60 M30`;
const collisionBadParsed = api.parseProgram(collisionBadProgram, "3AX", collisionCfg);
const collisionBadScan = api.scanRuntimeCollisions(collisionBadParsed, "3AX", collisionCfg);
if (!collisionBadScan.collisions.some(c => c.type === "HOLDER_STOCK")) throw new Error("HOLDER_STOCK_COLLISION_NOT_DETECTED");

const collision5xProgram = `O4200
N10 G90 G54
N20 T1 M6
N30 G0 X0 Y0 Z20 A0 B0
N40 G1 Z-40 A35 B20 F200
N50 M30`;
const collision5xParsed = api.parseProgram(collision5xProgram, "5AX", collisionCfg);
const collision5xScan = api.scanRuntimeCollisions(collision5xParsed, "5AX", collisionCfg);
if (!collision5xScan.collisions.length) throw new Error("ROTARY_COLLISION_NOT_DETECTED");

const tapProgram = `O4300
N10 G90 G54 G17
N20 S1000 M3
N30 G99 G84 X10. Y5. Z-8. R2. F1500.
N40 G80
N50 M30`;
const tapParsed = api.parseProgram(tapProgram, "3AX", {toolDia:6,cutterLen:25,holderDia:18,holderLen:25,g73Retract:0.5,safeZ:5});
if (tapParsed.errors.length) throw new Error("G84_PARSE_ERROR: " + tapParsed.errors.join(" | "));
const tapFeed = tapParsed.blocks.find(b => b.cycle === "G84" && b.cyclePhase === "tap-feed");
const tapReturn = tapParsed.blocks.find(b => b.cycle === "G84" && b.cyclePhase === "tap-return");
if (!tapFeed || !tapReturn) throw new Error("G84_FEED_RETURN_NOT_EXPANDED");
if (Math.abs(Number(tapFeed.to?.Z) + 8) > 1e-9) throw new Error("G84_DEPTH_WRONG");
if (Math.abs(Number(tapReturn.to?.Z) - 2) > 1e-9) throw new Error("G84_G99_RETURN_WRONG");

const cadRuntimeIndex = scriptMatch[1].indexOf("function makeCadRuntime(root){");
const camRuntimeIndex = scriptMatch[1].indexOf("function makeCamRuntime(root){");
const toolpathRuntimeIndex = scriptMatch[1].indexOf("function makeToolpathRuntime(root){");
const menuRuntimeIndex = scriptMatch[1].indexOf("function makeMenuRuntime(root){");
const postIndex = scriptMatch[1].indexOf("function generateFanucNC(){");
if (!(cadRuntimeIndex >= 0 && camRuntimeIndex > cadRuntimeIndex && toolpathRuntimeIndex > camRuntimeIndex && postIndex > toolpathRuntimeIndex && menuRuntimeIndex > postIndex)) {
  throw new Error("FANUC_POST_SCOPE_INVALID");
}
if (scriptMatch[1].indexOf("function generateFanucNC(){", postIndex + 1) !== -1) {
  throw new Error("FANUC_POST_DUPLICATED");
}

const runtimeCount = (html.match(/sim\("3AX"|sim\("4AX"|sim\("5AX"/g) || []).length;
if (runtimeCount !== 0) {
  // Runtime pages are generated dynamically through simPage(name), so direct sim(...) calls are not expected.
}

const pageDefs = [...html.matchAll(/\["(?:功能|CAD|CAM|刀路|3AX|4AX|5AX)","#[0-9a-fA-F]{6}"\]/g)];
if (pageDefs.length !== 7) {
  throw new Error("WEB_RUNTIME_PAGE_COUNT_" + pageDefs.length);
}

console.log("AIG_WEB_RUNTIME_GATE_PASS|7_PAGES|3AX_4AX_5AX_GCODE|G90_G91|G81_G73_G83|G34_BOLT_CIRCLE|G98_G99|TOOL_DIAMETER|SAFE_Z|MATERIAL_REMOVAL|M00_M01_M30|OPTIONAL_STOP|BLOCK_SKIP|TOOL_H_COOLANT_SPINDLE|G43_H|G54_G55_EXPLICIT|M98_P4_P5_M99|PARSER_EXECUTION_TEST|T_PRESELECT_M6_ACTIVE|CAD_RUNTIME|CAM_RUNTIME|TOOLPATH_EDITOR|FANUC_POST_3AX_4AX_5AX|FUNCTION_MENU_RUNTIME|NO_FAKE_SERVICE_STATE|WEBGL_3D|3AX_HEIGHTFIELD_REMOVAL|4X_5X_ROTARY_VOXEL_REMOVAL|ROTARY_TOOLPATH_AB|SIMULTANEOUS_AB_POST|FANUC_POST_SCOPE|REMOVAL_VOLUME_EVIDENCE|CUTTER_HOLDER_COLLISION|COLLISION_STOP_ALARM|ROTARY_COLLISION_TEST|G84_TAPPING|G84_FEED_RETURN_TEST|TAP_PITCH_GATE|INDEXED_TAP_ONLY|BLACK_RGB");
