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
  'data-tp-tooldia',
  'data-tp-cutterlen',
  'data-tp-holderdia',
  'data-tp-holderlen',
  'postGeometry',
  'NC 碰撞 Preflight FAIL',
  'scanRuntimeCollisions(preParsed,target,collisionCfg)',
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
  'function aigFieldIssue',
  'function aigValidateField',
  'function aigValidateAllFields',
  'function aigBindFieldFeedback',
  'function aigGuard',
  'function aigFiniteNumber',
  '只暫停加工播放',
  '此次不輸出 NC，其他功能仍可繼續使用',
  '原始 G-code 已保留',
  '已自動切換 2D fallback',
  'AIG 已保留目前資料並繼續運作',
  'Runtime 發生可恢復錯誤',
  '非同步作業失敗',
  'function validateMachineFields',
  'function validateCamFields',
  'function validateCadFields',
  'OFFSET = 0.000 mm',
  'ARRAY X = 0.000 mm',
  'DIM 必須大於 0 mm',
  '模擬幀發生可恢復錯誤',
  'function aigStorageGet',
  'function aigStorageSet',
  'aigStorageSet(root,"aig-code-"+target,code,target+" NC")',
  'aigStorageSet(root,"aig-code-"+axis,ta.value,axis+" G-code")',
  'function aigStorageRemove',
  'function aigJsonRead',
  'function aigJsonWrite',
  '使用目前記憶體資料繼續運作',
  '本次內容仍保留在目前畫面，不停止 AIG',
  'data-cam-stocktop',
  'data-cam-stockthickness',
  'data-cam-stepdown',
  'data-cam-layer-count',
  'function zLayerDepths',
  'function zLevelPaths',
  'state.strategy==="ZLEVEL"',
  'aig-stock-v1',
  '加工深度',
  '超過毛坯底面',
  '只阻擋這次刀路計算',
  'function runtimeStockEnvelope(parsed,cfg={})',
  'stock:stockConfig',
  'aig-stock-updated',
  'heightfield(scene,minX,minY,spanX,spanY,stockTop,stockBottom)',
  'voxelStock(scene,minX,minY,spanX,spanY,stockTop,stockBottom)',
  'stockBottom',
  'stockTopRaw',
  'Math.min(from.Z,to.Z)<stockTop',
  'function validateToolpathFields',
  'CAM 欄位檢查',
  '刀路欄位檢查',
  '只取消這次套用',
  'data-cam-marginx',
  'data-cam-marginy',
  'explicitXY:hasXY',
  'stockMarginX',
  'stockMarginY',
  '["自適應粗加工","ADAPTIVE",true]',
  'data-cam-adaptive-load',
  '自適應粗加工目前是 2.5D 封閉區域核心',
  'function adaptivePaths',
  'radialEngagement',
  'adaptiveRing',
  'state.strategy==="ADAPTIVE"',
  '只對封閉 RECT/CIRCLE/HOLE 產生真 2.5D 分層刀路',
  'adaptiveMeta',
  '自適應負載超界',
  '自適應層級資料錯誤',
  '• Load ',
  'function buildAdaptive2DPaths',
  'AIG ADAPTIVE 2.5D',
  'stock:state.payload?.stock||aigJsonRead(root,"aig-stock-v1",null,"毛坯資料")',
  'Adaptive OP 保留 Z 層 / Ring / Load% 並使用角度限制 Ramp Loop 進刀',
  '["工件組裝","ASSEMBLY"]',
  'function assemblyView',
  'aig-assembly-v1',
  'ASSEMBLY_VISE',
  '依毛坯建立虎鉗預設',
  'function runtimeAssemblyBoxes',
  'TOOL_FIXTURE',
  'HOLDER_FIXTURE',
  'aig-assembly-updated',
  'assembly:assemblyConfig',
  'assembly:aigJsonRead(root,"aig-assembly-v1"',
  'data-stock-size',
  'data-removal-percent',
  'data-remaining-volume',
  'data-fixture-count',
  'data-adaptive-op',
  'adaptiveContext',
  'AIG OP END',
  'activeAdaptive',
  'data-tp-action="UP"',
  'data-tp-action="DOWN"',
  'data-tp-action="ENABLE"',
  '[OFF] ',
  'const enabledPaths=state.paths.filter(p=>p.enabled!==false)',
  'OP 已上移',
  'OP 已下移',
  '不會輸出 NC',
  '只輸出啟用 OP，順序依刀路列表',
  'function evaluateSetupClearance',
  'function sphereBoxClearance',
  'data-tp-clearance',
  'data-tp-clearance-status',
  'Setup Clearance FAIL',
  '只阻擋這次 NC 輸出',
  'Setup Clearance 已通過',
  'entry:"RAMP_LOOP"',
  'entryZStart',
  'AIG RAMP LOOP',
  'Ramp Z 資料錯誤',
  'rampLoop=path.kind==="adaptive"',
  'highestObstacle',
  'data-setup-clearance',
  'setupClearance:null',
  'state.setupClearance=aigGuard',
  '裝夾間隙',
  'data-cam-ramp-angle',
  'adaptiveRampAngleDeg',
  'function appendAdaptive',
  'rampAngleDeg',
  'maxRampAngleDeg',
  'totalRampSegments',
  'AIG RAMP LOOP P',
  'Ramp 角度超過限制',
  'const rampMatch=raw.match',
  'rampPasses:Number(rampMatch[1])',
  'rampAngleDeg:Number(rampMatch[2])',
  'Ramp×',
  'function assemblySetupCheck',
  'data-menu-action="ASSEMBLY_CHECK"',
  'data-assembly-check',
  '3/4/5AX Setup 檢查',
  '只顯示問題，不停止 AIG',
  '3AX / 4AX / 5AX Setup 檢查全部 PASS',
  'setupClearance:state.setupClearance',
  'fixtureAlarm?rgb',
  'fixtureLimit?rgb',
  'initialRequiredClearance',
  'aig-clearance-updated',
  'requiredClearance:state.requiredClearance',
  'clearanceValue<requiredClearance',
  'state.requiredClearance.toFixed(3)',
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
const api = new Function(core + "\nreturn {parseProgram,compilePrograms,scanRuntimeCollisions,sampleRuntimeBlock,runtimeStockEnvelope,buildAdaptive2DPaths,runtimeAssemblyBoxes,evaluateSetupClearance};")();

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

const zeroSafeProgram = `O4400
N10 G90 G0 Z10.
N20 G81 X0. Y0. Z-2. F100.
N30 G80
N40 M30`;
const zeroSafeParsed = api.parseProgram(zeroSafeProgram, "3AX", {g73Retract:0,safeZ:0});
const zeroSafeRapid = zeroSafeParsed.blocks.find(b => b.cycle === "G81" && b.cyclePhase === "rapid-r");
if (!zeroSafeRapid || Math.abs(Number(zeroSafeRapid.to?.Z)) > 1e-9) throw new Error("SAFE_Z_ZERO_WAS_REPLACED");
if (Math.abs(Number(tapFeed.to?.Z) + 8) > 1e-9) throw new Error("G84_DEPTH_WRONG");
if (Math.abs(Number(tapReturn.to?.Z) - 2) > 1e-9) throw new Error("G84_G99_RETURN_WRONG");

const stockParsed = api.parseProgram("O4400\nN10 G90 G54\nN20 G0 X0 Y0 Z10\nN30 G1 Z-5 F100\nN40 X20\nN50 M30", "3AX", {safeZ:5});
const stockFallback = api.runtimeStockEnvelope(stockParsed, {});
const stockExplicit = api.runtimeStockEnvelope(stockParsed, {stock:{top:2,thickness:18}});
if (Math.abs(stockFallback.stockTop) > 1e-9) throw new Error("STOCK_FALLBACK_TOP_WRONG");
if (Math.abs(stockExplicit.stockTop - 2) > 1e-9 || Math.abs(stockExplicit.stockBottom + 16) > 1e-9 || Math.abs(stockExplicit.stockH - 18) > 1e-9) {
  throw new Error("EXPLICIT_STOCK_ENVELOPE_WRONG");
}
const explicitCollision = api.scanRuntimeCollisions(stockParsed, "3AX", {toolDia:10,cutterLen:30,holderDia:25,holderLen:25,safeZ:5,stock:{top:2,thickness:18}});
if (explicitCollision.envelope.stockTop !== 2 || explicitCollision.envelope.stockBottom !== -16) throw new Error("COLLISION_STOCK_ENVELOPE_NOT_PROPAGATED");

const stockTopCutParsed = api.parseProgram("O4500\nN10 G90 G54\nN20 G0 Z3.\nN30 G1 Z1. F100\nN40 G0 Z3.\nN50 M30", "3AX", {safeZ:5,stock:{top:2,thickness:10}});
const stockTopMoves = stockTopCutParsed.blocks.filter(b => b.kind === "move");
const insideStockMove = stockTopMoves.find(b => /G1 Z1/.test(b.raw));
const aboveStockRapid = stockTopMoves.find(b => /G0 Z3/.test(b.raw));
if (!insideStockMove?.cutting) throw new Error("STOCK_TOP_RELATIVE_CUTTING_NOT_DETECTED");
if (aboveStockRapid?.cutting) throw new Error("ABOVE_STOCK_MOVE_FALSE_CUTTING");

const stockXY = api.runtimeStockEnvelope(stockParsed, {stock:{top:2,thickness:18,minX:-5,maxX:30,minY:-7,maxY:17}});
if (!stockXY.explicitXY || stockXY.minX !== -5 || stockXY.maxX !== 30 || stockXY.minY !== -7 || stockXY.maxY !== 17) {
  throw new Error("EXPLICIT_STOCK_XY_ENVELOPE_WRONG");
}
if (stockXY.stockTop !== 2 || stockXY.stockBottom !== -16) throw new Error("EXPLICIT_STOCK_XYZ_ENVELOPE_WRONG");

const adaptiveRect = {id:7,type:"rect",a:{x:0,y:0},b:{x:50,y:30}};
const adaptiveParams = {toolDia:10,adaptiveLoad:.35,safeZ:5,feed:1200,rpm:12000,direction:"CW"};
const adaptivePaths = api.buildAdaptive2DPaths(adaptiveRect, adaptiveParams, [-2,-4]);
if (!adaptivePaths.length) throw new Error("ADAPTIVE_RECT_NO_PATHS");
if (!adaptivePaths.some(p => p.zLevelIndex === 1) || !adaptivePaths.some(p => p.zLevelIndex === 2)) throw new Error("ADAPTIVE_Z_LAYERS_MISSING");
if (!adaptivePaths.every(p => p.kind === "adaptive" && p.closed && p.points.length >= 5)) throw new Error("ADAPTIVE_PATH_GEOMETRY_INVALID");
if (!adaptivePaths.every(p => p.adaptiveRing >= 1 && p.zLevelCount === 2)) throw new Error("ADAPTIVE_RING_METADATA_INVALID");
if (!adaptivePaths.every(p => p.radialEngagement > 0 && p.radialEngagement <= .35 + 1e-9)) throw new Error("ADAPTIVE_LOAD_LIMIT_BROKEN");
if (!adaptivePaths.every(p => p.entry === "RAMP_LOOP" && Number.isFinite(p.entryZStart))) throw new Error("ADAPTIVE_RAMP_METADATA_MISSING");
const adaptiveLayer1 = adaptivePaths.find(p => p.zLevelIndex === 1 && p.adaptiveRing === 1);
const adaptiveLayer2 = adaptivePaths.find(p => p.zLevelIndex === 2 && p.adaptiveRing === 1);
if (!adaptiveLayer1 || Math.abs(adaptiveLayer1.entryZStart - 0) > 1e-9 || Math.abs(adaptiveLayer1.depth + 2) > 1e-9) throw new Error("ADAPTIVE_RAMP_LAYER1_WRONG");
if (!adaptiveLayer2 || Math.abs(adaptiveLayer2.entryZStart + 2) > 1e-9 || Math.abs(adaptiveLayer2.depth + 4) > 1e-9) throw new Error("ADAPTIVE_RAMP_LAYER2_WRONG");

const rampAngleParams = {...adaptiveParams,stockTop:0,adaptiveRampAngleDeg:5};
const rampLarge = api.buildAdaptive2DPaths({id:71,type:"rect",a:{x:0,y:0},b:{x:50,y:30}}, rampAngleParams, [-2]).find(p => p.adaptiveRing === 1);
if (!rampLarge || rampLarge.rampPasses !== 1 || !(rampLarge.rampAngleDeg > 0 && rampLarge.rampAngleDeg <= 5 + 1e-9)) {
  throw new Error("ADAPTIVE_RAMP_LARGE_GEOMETRY_WRONG");
}
const rampSmall = api.buildAdaptive2DPaths({id:72,type:"circle",c:{x:0,y:0},r:8}, rampAngleParams, [-2])[0];
if (!rampSmall || !(rampSmall.rampPasses >= 2) || !(rampSmall.rampAngleDeg > 0 && rampSmall.rampAngleDeg <= 5 + 1e-9)) {
  throw new Error("ADAPTIVE_RAMP_SMALL_AUTO_MULTIPASS_FAILED");
}
const theoreticalOnePassAngle = Math.atan2(2, rampSmall.rampPathLength) * 180 / Math.PI;
if (!(theoreticalOnePassAngle > 5)) throw new Error("ADAPTIVE_RAMP_SMALL_TEST_NOT_STEEP_ENOUGH");
if (!(rampSmall.rampAngleDeg < theoreticalOnePassAngle)) throw new Error("ADAPTIVE_RAMP_MULTIPASS_DID_NOT_REDUCE_ANGLE");
const adaptiveCircle = api.buildAdaptive2DPaths({id:8,type:"circle",c:{x:0,y:0},r:20}, adaptiveParams, [-2]);
if (!adaptiveCircle.length || !adaptiveCircle.every(p => p.points.length >= 33)) throw new Error("ADAPTIVE_CIRCLE_PATH_INVALID");
const adaptiveOpen = api.buildAdaptive2DPaths({id:9,type:"line",a:{x:0,y:0},b:{x:20,y:0}}, adaptiveParams, [-2]);
if (adaptiveOpen.length !== 0) throw new Error("ADAPTIVE_OPEN_GEOMETRY_MUST_BE_IGNORED");

const adaptiveTraceProgram = `O6000
N10 G90 G54
N20 (AIG ADAPTIVE 2.5D L2/4 R3 LOAD35%)
N30 G0 Z5.
N40 G1 X10. Y0. Z-4. F1200
N50 G1 X20. Y0.
N60 (AIG OP END)
N70 G0 Z5.
N80 M30`;
const adaptiveTraceParsed = api.parseProgram(adaptiveTraceProgram, "3AX", {safeZ:5,stock:{top:0,thickness:20,minX:-5,maxX:30,minY:-5,maxY:10}});
const adaptiveTraceBlocks = adaptiveTraceParsed.blocks.filter(b => b.adaptive);
if (adaptiveTraceBlocks.length < 3) throw new Error("ADAPTIVE_TRACE_NOT_PROPAGATED");
if (!adaptiveTraceBlocks.every(b => b.adaptive.zLevelIndex === 2 && b.adaptive.zLevelCount === 4 && b.adaptive.adaptiveRing === 3 && Math.abs(b.adaptive.radialEngagement - .35) < 1e-9)) {
  throw new Error("ADAPTIVE_TRACE_METADATA_WRONG");
}
const afterAdaptiveEnd = adaptiveTraceParsed.blocks.find(b => /N70 G0 Z5/.test(b.raw));
if (!afterAdaptiveEnd || afterAdaptiveEnd.adaptive) throw new Error("ADAPTIVE_TRACE_CONTEXT_LEAK");

const adaptiveRampTraceProgram = `O7100
N10 G90 G54
N20 (AIG ADAPTIVE 2.5D L1/3 R2 LOAD35%)
N25 (AIG RAMP LOOP P2 ANG3.04 Z0 TO Z-2)
N30 G0 X0 Y0 Z5
N40 G1 X10 Y0 Z-1 F500
N50 G1 X0 Y0 Z-2
N60 (AIG OP END)
N70 G0 Z5
N80 M30`;
const adaptiveRampTraceParsed = api.parseProgram(adaptiveRampTraceProgram, "3AX", {safeZ:5,stock:{top:0,thickness:20,minX:-5,maxX:20,minY:-5,maxY:5}});
const rampTraceBlocks = adaptiveRampTraceParsed.blocks.filter(b => b.adaptive);
if (!rampTraceBlocks.length || !rampTraceBlocks.every(b => b.adaptive.rampPasses === 2 && Math.abs(b.adaptive.rampAngleDeg - 3.04) < 1e-9 && b.adaptive.entryZStart === 0 && b.adaptive.depth === -2)) {
  throw new Error("ADAPTIVE_RAMP_SIM_TRACE_WRONG");
}
const afterRampEnd = adaptiveRampTraceParsed.blocks.find(b => /N70 G0 Z5/.test(b.raw));
if (!afterRampEnd || afterRampEnd.adaptive) throw new Error("ADAPTIVE_RAMP_SIM_CONTEXT_LEAK");

const assemblyCfg = {
  toolDia:10,cutterLen:30,holderDia:25,holderLen:25,safeZ:5,
  stock:{top:0,thickness:20,minX:-20,maxX:20,minY:-20,maxY:20},
  assembly:{items:[
    {id:"C1",type:"CLAMP",name:"測試壓板",x:30,y:0,z:-5,w:20,d:20,h:20,enabled:true},
    {id:"OFF",type:"FIXTURE",name:"停用模組",x:0,y:0,z:0,w:10,d:10,h:10,enabled:false},
    {id:"BAD",type:"FIXTURE",name:"非法尺寸",x:0,y:0,z:0,w:0,d:10,h:10,enabled:true}
  ]}
};
const assemblyBoxes = api.runtimeAssemblyBoxes(assemblyCfg);
if (assemblyBoxes.length !== 1 || assemblyBoxes[0].id !== "C1") throw new Error("ASSEMBLY_BOX_FILTER_BROKEN");
if (assemblyBoxes[0].minX !== 20 || assemblyBoxes[0].maxX !== 40 || assemblyBoxes[0].minZ !== -5 || assemblyBoxes[0].maxZ !== 15) throw new Error("ASSEMBLY_BOX_GEOMETRY_WRONG");

const fixtureProgram = api.parseProgram("O5000\nN10 G90 G54\nN20 G0 X30 Y0 Z25\nN30 G1 Z0 F100\nN40 M30","3AX",assemblyCfg);
const fixtureScan = api.scanRuntimeCollisions(fixtureProgram,"3AX",assemblyCfg);
if (!fixtureScan.collisions.some(c => c.type === "TOOL_FIXTURE" && c.fixtureId === "C1")) throw new Error("TOOL_FIXTURE_COLLISION_NOT_DETECTED");

const fixtureSafeProgram = api.parseProgram("O5001\nN10 G90 G54\nN20 G0 X-30 Y0 Z25\nN30 M30","3AX",assemblyCfg);
const fixtureSafeScan = api.scanRuntimeCollisions(fixtureSafeProgram,"3AX",assemblyCfg);
if (fixtureSafeScan.collisions.some(c => c.type === "TOOL_FIXTURE" || c.type === "HOLDER_FIXTURE")) throw new Error("FIXTURE_FALSE_POSITIVE");

const fixture5xProgram = api.parseProgram("O5002\nN10 G90 G54\nN20 G0 X10 Y0 Z-30 A0 B90\nN30 M30","5AX",assemblyCfg);
const fixture5xScan = api.scanRuntimeCollisions(fixture5xProgram,"5AX",assemblyCfg);
if (!fixture5xScan.collisions.some(c => c.type === "TOOL_FIXTURE" && c.fixtureId === "C1")) throw new Error("ROTARY_FIXTURE_COLLISION_NOT_DETECTED");

const clearanceBase = {toolDia:10,cutterLen:30,holderDia:25,holderLen:25,stock:{top:0,thickness:20,minX:-20,maxX:30,minY:-20,maxY:20}};
const clearanceProgramText = "O7000\nN10 G90 G54\nN20 G0 X0 Y0 Z20\nN30 G1 X20 Y0 Z-2 F300\nN40 G0 Z20\nN50 M30";

const clearanceFarCfg = {...clearanceBase,safeZ:20,assembly:{items:[{id:"FAR",type:"CLAMP",name:"遠夾具",x:60,y:0,z:0,w:10,d:10,h:10}]}};
const clearanceFarParsed = api.parseProgram(clearanceProgramText,"3AX",clearanceFarCfg);
const clearanceFar = api.evaluateSetupClearance(clearanceFarParsed,"3AX",clearanceFarCfg);
if (!(clearanceFar.minimum >= 2)) throw new Error("SETUP_CLEARANCE_SAFE_CASE_FAILED");

const clearanceNearCfg = {...clearanceBase,safeZ:20,assembly:{items:[{id:"NEAR",type:"CLAMP",name:"近夾具",x:31.5,y:0,z:0,w:10,d:12,h:8}]}};
const clearanceNearParsed = api.parseProgram(clearanceProgramText,"3AX",clearanceNearCfg);
const clearanceNearCollision = api.scanRuntimeCollisions(clearanceNearParsed,"3AX",clearanceNearCfg);
const clearanceNear = api.evaluateSetupClearance(clearanceNearParsed,"3AX",clearanceNearCfg);
if (clearanceNearCollision.collisions.length) throw new Error("SETUP_CLEARANCE_NEAR_CASE_ALREADY_COLLIDING");
if (!(clearanceNear.minimum >= 0 && clearanceNear.minimum < 2)) throw new Error("SETUP_CLEARANCE_NEAR_THRESHOLD_NOT_DETECTED");

const clearanceSafeZCfg = {...clearanceBase,safeZ:5,assembly:{items:[{id:"HIGH",type:"CLAMP",name:"高夾具",x:60,y:0,z:0,w:10,d:10,h:8}]}};
const clearanceSafeZParsed = api.parseProgram(clearanceProgramText,"3AX",clearanceSafeZCfg);
const clearanceSafeZ = api.evaluateSetupClearance(clearanceSafeZParsed,"3AX",clearanceSafeZCfg);
if (clearanceSafeZ.limitingType !== "SAFE_Z" || !(clearanceSafeZ.minimum < 0)) throw new Error("SAFE_Z_CLEARANCE_NOT_DETECTED");

const stockTopSafeCfg = {...clearanceBase,safeZ:1,stock:{top:2,thickness:20,minX:-20,maxX:30,minY:-20,maxY:20},assembly:{items:[]}};
const stockTopSafeParsed = api.parseProgram(clearanceProgramText,"3AX",stockTopSafeCfg);
const stockTopSafe = api.evaluateSetupClearance(stockTopSafeParsed,"3AX",stockTopSafeCfg);
if (stockTopSafe.limitingType !== "SAFE_Z" || Math.abs(stockTopSafe.minimum + 1) > 1e-9) throw new Error("STOCK_TOP_SAFE_Z_CLEARANCE_NOT_DETECTED");

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

const forbiddenSilentFallbacks = [
  'safeZ:Number(safeInput.value)||5',
  'depth:Number(depthInput.value)||-10',
  'Number(opts.safeZ)||5',
  'Number(opts.g73Retract)||0.5'
];
for (const legacy of forbiddenSilentFallbacks) {
  if (html.includes(legacy)) throw new Error("SILENT_NUMERIC_FALLBACK_RETURNED: " + legacy);
}

const pageDefs = [...html.matchAll(/\["(?:功能|CAD|CAM|刀路|3AX|4AX|5AX)","#[0-9a-fA-F]{6}"\]/g)];
if (pageDefs.length !== 7) {
  throw new Error("WEB_RUNTIME_PAGE_COUNT_" + pageDefs.length);
}

console.log("AIG_WEB_RUNTIME_GATE_PASS|7_PAGES|3AX_4AX_5AX_GCODE|G90_G91|G81_G73_G83|G34_BOLT_CIRCLE|G98_G99|TOOL_DIAMETER|SAFE_Z|MATERIAL_REMOVAL|M00_M01_M30|OPTIONAL_STOP|BLOCK_SKIP|TOOL_H_COOLANT_SPINDLE|G43_H|G54_G55_EXPLICIT|M98_P4_P5_M99|PARSER_EXECUTION_TEST|T_PRESELECT_M6_ACTIVE|CAD_RUNTIME|CAM_RUNTIME|TOOLPATH_EDITOR|FANUC_POST_3AX_4AX_5AX|FUNCTION_MENU_RUNTIME|NO_FAKE_SERVICE_STATE|WEBGL_3D|3AX_HEIGHTFIELD_REMOVAL|4X_5X_ROTARY_VOXEL_REMOVAL|ROTARY_TOOLPATH_AB|SIMULTANEOUS_AB_POST|FANUC_POST_SCOPE|REMOVAL_VOLUME_EVIDENCE|CUTTER_HOLDER_COLLISION|COLLISION_STOP_ALARM|ROTARY_COLLISION_TEST|G84_TAPPING|G84_FEED_RETURN_TEST|TAP_PITCH_GATE|INDEXED_TAP_ONLY|POST_COLLISION_PREFLIGHT|EXPLICIT_POST_TOOL_GEOMETRY|INLINE_FIELD_FEEDBACK|NONFATAL_RUNTIME_ERRORS|CAD_SEMANTIC_VALIDATION|ANIMATION_RECOVERY|FIELD_ISSUE_CENTER|ZERO_VALUE_PRESERVED|NO_SILENT_NUMERIC_FALLBACK|NONBLOCKING_USER_MESSAGES|WORKPIECE_ASSEMBLY|FIXTURE_WEBGL|FIXTURE_COLLISION|ROTARY_FIXTURE_COLLISION|ASSEMBLY_POST_PREFLIGHT|MATERIAL_REMOVAL_PERCENT|REMAINING_VOLUME|FIXTURE_HUD|ADAPTIVE_SIM_TRACE|ADAPTIVE_CONTEXT_END|OP_REORDER|OP_ENABLE_DISABLE|POST_ENABLED_SEQUENCE|SETUP_CLEARANCE|NEAR_MISS_CLEARANCE|SAFE_Z_CLEARANCE|STOCK_TOP_SAFE_Z|NONFATAL_CLEARANCE_BLOCK|ADAPTIVE_RAMP_LOOP|ADAPTIVE_RAMP_LAYER_CHAIN|CACHED_SETUP_CLEARANCE_HUD|3AX_4AX_5AX_CLEARANCE_HUD|ADAPTIVE_RAMP_ANGLE_LIMIT|ADAPTIVE_RAMP_AUTO_MULTIPASS|ADAPTIVE_RAMP_SMALL_GEOMETRY|ADAPTIVE_RAMP_SIM_TRACE|ADAPTIVE_RAMP_CONTEXT_END|ASSEMBLY_SETUP_CHECK|MULTI_AXIS_SETUP_CHECK|NONFATAL_SETUP_REPORT|FIXTURE_ALARM_VISUAL|LOW_CLEARANCE_FIXTURE_VISUAL|SHARED_CLEARANCE_THRESHOLD|LIVE_CLEARANCE_THRESHOLD|POST_HUD_3D_CLEARANCE_SYNC|BLACK_RGB");
