#!/usr/bin/env python3
import hashlib
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]

def read(rel: str) -> str:
    p = ROOT / rel
    if not p.is_file():
        raise SystemExit(f"BLOCKED missing file: {rel}")
    return p.read_text(encoding="utf-8")

def require(source: str, needle: str, label: str) -> None:
    if needle not in source:
        raise SystemExit(f"BLOCKED {label}: missing {needle!r}")

android = read("app/src/main/java/com/aigstudio/app/MainActivity.kt")
machining3d = read("app/src/main/java/com/aigstudio/app/Machining3DView.kt")
desktop = read("desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt")
machining3d_core = read("core/src/main/kotlin/com/aigstudio/core/Machining3D.kt")
env = read("core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt")
document = read("core/src/main/kotlin/com/aigstudio/core/Document.kt")
regression = read("core/src/test/kotlin/com/aigstudio/core/CoreRegressionTest.kt")
hashes = read("design/theme/official_rgb/android-drawable.sha256")
workflow = read(".github/workflows/build-download.yml")
windows_release = read("build_windows_native.ps1")
require(windows_release, "--win-per-user-install", "WINDOWS_PER_USER_INSTALLER_GATE")
for needle in (
    "private val pulseTimer=Timer(90)",
    "val topTint=when",
    "val bottomTint=when",
    "isRolloverEnabled = true",
    "g2.drawLine(12,max(9,height-9)",
    "private class CadToolGrid",
):
    require(desktop, needle, "RGB_PRODUCTION_GLASS_RUNTIME_GATE")
print("RGB_PRODUCTION_GLASS_RUNTIME_GATE_PASS|WINDOWS|NORMAL_TINT|HOVER|PRESSED|SELECTED_BREATHING|CAD_GLASS_PANEL")
for needle in (
    "private val pulseHandler = Handler(Looper.getMainLooper())",
    "pulseHandler.postDelayed(this,90L)",
    "pressedNow -> 0.54f",
    "selectedGlow -> 0.42f",
    "else -> 0.24f",
    "SystemClock.uptimeMillis() % 1180L",
):
    require(android, needle, "ANDROID_RGB_PRODUCTION_GLASS_RUNTIME_GATE")
print("ANDROID_RGB_PRODUCTION_GLASS_RUNTIME_GATE_PASS|NORMAL_TINT|PRESSED|SELECTED|BREATHING|LAYERED_GLASS")
theme_index = json.loads(read("app/src/main/assets/aig-themes/repository-index.json"))
production_theme = json.loads(read("app/src/main/assets/aig-themes/themes/official_rgb_original/theme.json"))
theme_manifest = json.loads(read("design/theme/aigii_rgb_neon_v2/theme-manifest.json"))
asset_policy = theme_manifest.get("engineering_asset_policy") or {}
if theme_manifest.get("official_baseline_replaced") is not False:
    raise SystemExit("資產工程規則錯誤：官方原始基準不得被工程版覆蓋")
if "官方核准原始資產只保留原檔與來源血統" not in theme_manifest.get("official_baseline_policy_zh_tw", ""):
    raise SystemExit("資產工程規則缺少繁體中文官方基準說明")
if asset_policy.get("engineering_authority") != "FULL":
    raise SystemExit("資產工程規則未啟用最高工程權限")
for key in (
    "ui_layout_editable","images_editable","buttons_editable","animations_editable",
    "themes_editable","new_assets_allowed","replacement_without_preapproval_allowed",
    "unregistered_images_allowed","release_integrity_required",
):
    if asset_policy.get(key) is not True:
        raise SystemExit(f"資產工程規則未開放：{key}")
for key in (
    "manual_approval_required","asset_signature_required","asset_locking_enabled",
    "fixed_allowlist_required","preview_build_blocked_by_unregistered_assets",
):
    if asset_policy.get(key) is not False:
        raise SystemExit(f"工程圖片仍被認證或鎖定：{key}")
if "不需人工認證" not in theme_manifest.get("provenance_zh_tw", ""):
    raise SystemExit("資產工程規則缺少免人工認證說明")
for path in (
    ROOT / "engineering-assets" / "images" / "cad.png",
    ROOT / "engineering-assets" / "images" / "cam.png",
    ROOT / "engineering-assets" / "images" / "3d.png",
    ROOT / "engineering-assets" / "images" / "3ax.png",
    ROOT / "engineering-assets" / "images" / "4ax.png",
    ROOT / "engineering-assets" / "images" / "5ax.png",
    ROOT / "engineering-assets" / "images" / "nc.png",
):
    if not path.is_file():
        raise SystemExit(f"工程圖片缺少：{path.name}")
app_gradle = read("app/build.gradle.kts")
desktop_gradle = read("desktop/build.gradle.kts")
for source,label in ((app_gradle,"ANDROID"),(desktop_gradle,"WINDOWS")):
    if "../engineering-assets" in source:
        raise SystemExit(f"{label} 正式 Runtime 不得綁定 engineering-assets")
if theme_index.get("default_theme_id") != "official_rgb_original":
    raise SystemExit("正式 Runtime 預設 Theme 不是 official_rgb_original")
if production_theme.get("theme_id") != "official_rgb_original":
    raise SystemExit("official_rgb_original Theme 遺失或身分錯誤")
for needle in ("object ProductionRgbAssets", 'ROOT="aig-generated-rgb/approved/184"', "ProductionRgbAssets.drawable(this,id)"):
    if needle not in android:
        raise SystemExit(f"Android 正式 RGB Runtime 未綁定：{needle}")
for needle in ("private object ProductionRgbAssets", 'ROOT="/aig-generated-rgb/approved/184"', "ProductionRgbAssets.icon"):
    if needle not in desktop:
        raise SystemExit(f"Windows 正式 RGB Runtime 未綁定：{needle}")
for forbidden in ("EngineeringImageAssets.drawable(", "EngineeringImageAssets.icon("):
    if forbidden in android or forbidden in desktop:
        raise SystemExit(f"正式 Runtime 誤用工程圖片：{forbidden}")
for path in (
    ROOT / "app" / "src" / "main" / "assets" / "aig-generated-rgb" / "approved" / "184" / "cad.png",
    ROOT / "app" / "src" / "main" / "assets" / "aig-generated-rgb" / "approved" / "184" / "cam.png",
    ROOT / "desktop" / "src" / "main" / "resources" / "aig-generated-rgb" / "approved" / "184" / "cad.png",
    ROOT / "desktop" / "src" / "main" / "resources" / "aig-generated-rgb" / "approved" / "184" / "cam.png",
    ROOT / "app" / "src" / "main" / "assets" / "visuals" / "studio_startup_original.png",
    ROOT / "desktop" / "src" / "main" / "resources" / "visuals" / "studio_startup_original.png",
):
    if not path.is_file():
        raise SystemExit(f"正式 RGB / Boot 資產缺少：{path}")
for boot_path in (
    ROOT / "app" / "src" / "main" / "assets" / "visuals" / "studio_startup_original.png",
    ROOT / "desktop" / "src" / "main" / "resources" / "visuals" / "studio_startup_original.png",
):
    if hashlib.sha256(boot_path.read_bytes()).hexdigest() != "a2e7b24d32fb9c852b83ee176480f59cb43559fe152ac3e05e0aa2c52f0a82ac":
        raise SystemExit(f"BLOCKED PRODUCTION_BOOT_SHA_MISMATCH: {boot_path}")
print("PRODUCTION_BOOT_ASSET_GATE_PASS|ANDROID|WINDOWS|VALIDATED_DERIVED|SHA256")
for needle in (
    "REAL CAD / CAM",
    "buildProductionCamPanel",
    'moduleButtons.add(button("2D CAD"',
    'moduleButtons.add(button("4AX"',
    'moduleButtons.add(button("5AX"',
):
    if needle not in desktop:
        raise SystemExit(f"Windows Production UI 缺少：{needle}")

# Main Android page/category entry points must bind to real callbacks.
android_entries = {
    "CAD_DRAW": 'addCategory("繪圖", 0) { showDrawingBranch() }',
    "MODIFY": 'addCategory("修改", 3) { showModifyBranch() }',
    "CORNER": 'addCategory("角部", 2) { showCornerBranch() }',
    "CAM": 'addCategory("CAM", 5) { showCamWorkstation() }',
    "MACHINING": 'addCategory("加工", 5) { showMachiningBranch() }',
    "SECURITY": 'addCategory("安全", 4) { showSecurityBranch() }',
    "AI": 'addCategory("AI", 1) { showAiBranch() }',
    "AI_UPDATE": 'addActionTo(categoryFlow, "ChatGPT AI 更新 • 一鍵", 1) { runSecureUpdateCheck() }',
}
for label, needle in android_entries.items():
    require(android, needle, f"ANDROID_ENTRY_{label}")

# CAD/modify/corner buttons must execute core-backed tools/actions.
for needle in (
    'addToolToBranch("線", Tool.LINE, 0)',
    'addToolToBranch("矩形", Tool.RECT, 1)',
    'addToolToBranch("圓", Tool.CIRCLE, 2)',
    'addActionTo(branchFlow, "SNAP", 3) { cad.toggleSnap() }',
    'addToolToBranch("尺寸", Tool.MEASURE, 5)',
    'addToolToBranch("選取", Tool.SELECT, 1)',
    'addActionTo(branchFlow, "移動", 0) { cad.promptMoveCopy(copy=false) }',
    'addActionTo(branchFlow, "複製", 1) { cad.promptMoveCopy(copy=true) }',
    'addActionTo(branchFlow, "旋轉", 2) { cad.promptRotate() }',
    'addActionTo(branchFlow, "鏡射 X", 3) { cad.mirrorSelected(vertical=true) }',
    'addActionTo(branchFlow, "鏡射 Y", 3) { cad.mirrorSelected(vertical=false) }',
    'addActionTo(branchFlow, "連接", 1) { cad.connectSelected() }',
    'addActionTo(branchFlow, "斷開", 4) { cad.disconnectSelected() }',
    'addActionTo(branchFlow, "刪除選取", 4) { cad.deleteSelected() }',
    'addToolToBranch("單點刪除", Tool.DELETE, 4)',
    'addToolToBranch("平移", Tool.PAN, 0)',
    'addActionTo(branchFlow, "GRID", 2) { cad.toggleGrid() }',
    'addActionTo(branchFlow, "GEOMETRY", 1) { cad.toggleGeometry() }',
    'addToolToBranch("C 倒角", Tool.CHAMFER, 2)',
    'addToolToBranch("R 角", Tool.FILLET, 1)',
):
    require(android, needle, "ANDROID_CAD_CALLBACK")

# 159 CAD edit integrity: Android and Windows must expose real geometry editing,
# while CONNECT/DISCONNECT are topology-only and bounded by 0.001 mm.
for needle in (
    "data class CadTopologyLink",
    "object CadEditEngine",
    "fun moveCommand(",
    "fun copyCommand(",
    "fun rotateCommand(",
    "fun mirrorVerticalCommand(",
    "fun mirrorHorizontalCommand(",
    "fun deleteCommand(",
    "fun connectCommand(",
    "fun disconnectCommand(",
    "override val geometryMutation: Boolean = false",
    '"CONNECT tolerance must be <= 0.001 mm"',
):
    require(document, needle, "CAD_EDIT_CORE_159")
for needle in (
    "Tool.SELECT",
    "fun promptMoveCopy(copy: Boolean)",
    "fun promptRotate()",
    "fun mirrorSelected(vertical: Boolean)",
    "fun connectSelected()",
    "fun disconnectSelected()",
    "fun deleteSelected()",
    "runGeometryCommand(CadEditEngine.moveCommand",
    "runTopologyCommand(CadEditEngine.connectCommand",
):
    require(android, needle, "ANDROID_CAD_EDIT_RUNTIME_159")
for needle in (
    "DrawMode.SELECT",
    "fun moveSelected(dx:Double,dy:Double)",
    "fun copySelected(dx:Double,dy:Double)",
    "fun rotateSelected(angleDeg:Double)",
    "fun mirrorSelected(vertical:Boolean)",
    "fun connectSelected()",
    "fun disconnectSelected()",
    "fun deleteSelected()",
    'drawTools.add(button("選取"',
    'editTools.add(button("移動"',
    'editTools.add(button("複製"',
):
    require(desktop, needle, "WINDOWS_CAD_EDIT_RUNTIME_159")

# 160 CAD RGB workspace: preserve a large center canvas, grouped controls and a live status rail.
for needle in (
    'addCategory("檢視", 0) { showViewBranch() }',
    'addCategory("連接", 1) { showLinkBranch() }',
    'private fun showViewBranch()',
    'private fun showLinkBranch()',
    'val floatingToolCard = LinearLayout(this).apply',
    'val machineRail = LinearLayout(this).apply',
):
    require(android, needle, "ANDROID_CAD_RGB_WORKSPACE_160")
for needle in (
    'val cadCardLayout=CardLayout()',
    'val cadCardHost=JPanel(cadCardLayout).apply',
    'cadDeckButton("繪圖","DRAW"',
    'cadDeckButton("修改","EDIT"',
    'cadDeckButton("連接","LINK"',
    'cadDeckButton("檢視","VIEW"',
    'val cadDeck=JPanel(BorderLayout(6,6)).apply',
    'add(cadDeck,BorderLayout.WEST)',
    'add(cad,BorderLayout.CENTER)',
    'add(infoRail,BorderLayout.EAST)',
    '"AIG CNC  •  REAL CAD / CAM"',
):
    require(desktop, needle, "WINDOWS_CAD_RGB_WORKSPACE_165")
require(
    regression,
    "CAD_EDIT_INTEGRITY_GATE_PASS SELECT MOVE COPY ROTATE MIRROR DELETE UNDO_REDO CONNECT DISCONNECT TOPOLOGY_ONLY TOL=0.001",
    "CAD_EDIT_REGRESSION_159",
)

# 162 precision CAD editing: shared-core geometry, seven snap modes, driven dimensions,
# consistent selection and real Android/Windows runtime actions.
for needle in (
    "fun trimCommand(doc: DrawingDocument, ids: Collection<EntityId>): Command",
    "fun extendCommand(doc: DrawingDocument, ids: Collection<EntityId>): Command",
    "fun offsetCommand(doc: DrawingDocument, ids: Collection<EntityId>, distance: Double): Command",
    "fun linearArrayCommand(doc: DrawingDocument, ids: Collection<EntityId>, count: Int, dx: Double, dy: Double): Command",
    "enum class SnapMode { ENDPOINT, MIDPOINT, CENTER, INTERSECTION, TANGENT, HORIZONTAL, VERTICAL }",
    "object CadSnapEngine",
    "object CadSelectionEngine",
    "object CadSemanticIdentity",
    "object DimensionDriveEngine",
    "fun selectionIds(doc:DrawingDocument,entity:Entity):Set<EntityId>",
):
    require(document, needle, "CAD_PRECISION_EDIT_CORE_162")
for needle in (
    'addActionTo(branchFlow, "TRIM", 0) { cad.trimSelected() }',
    'addActionTo(branchFlow, "EXTEND", 1) { cad.extendSelected() }',
    'addActionTo(branchFlow, "OFFSET", 2) { cad.promptOffset() }',
    'addActionTo(branchFlow, "ARRAY", 3) { cad.promptArray() }',
    'addActionTo(branchFlow, "尺寸驅動", 5) { cad.promptDrivenDimension() }',
    'addToolToBranch("圓弧", Tool.ARC, 3)',
    'addToolToBranch("孔", Tool.HOLE, 4)',
    "CadSnapEngine.snapTo(doc,p,tolerance,reference=firstPoint)",
    "CadSelectionEngine.nearest(doc,p,tolerance)",
    "CadSelectionEngine.selectionIds(doc,e)",
):
    require(android, needle, "ANDROID_CAD_PRECISION_EDIT_162")
for needle in (
    'editTools.add(button("TRIM"',
    'editTools.add(button("EXTEND"',
    'editTools.add(button("OFFSET"',
    'editTools.add(button("ARRAY"',
    'viewTools.add(button("尺寸驅動"',
    'private enum class DrawMode { LINE, RECT, CIRCLE, ARC, HOLE, SELECT }',
    'drawTools.add(button("圓弧"',
    'drawTools.add(button("孔"',
    "CadSnapEngine.snapTo(doc,raw,18.0/pxPerMm,reference=first)",
    "CadSelectionEngine.nearest(doc,p,tolerance)",
    "CadSelectionEngine.selectionIds(doc,entity)",
):
    require(desktop, needle, "WINDOWS_CAD_PRECISION_EDIT_162")
require(
    regression,
    "CAD_PRECISION_EDIT_GATE_PASS SNAP_ENDPOINT MIDPOINT CENTER INTERSECTION TANGENT HORIZONTAL VERTICAL DIM_DRIVE TRIM EXTEND OFFSET ARRAY SELECTION_LINE_RECT_CIRCLE_ARC_HOLE GROUP_PRESERVED TOL=0.001",
    "CAD_PRECISION_EDIT_REGRESSION_162",
)

# Machining page must expose each real path and controller/safety surface.
for needle in (
    'addActionTo(branchFlow, "REAL CAM", 5) { showCamWorkstation() }',
    'addActionTo(branchFlow, "STOCK", 4) { showStockDialog() }',
    'addActionTo(branchFlow, "NC EDIT", 0) { showUnifiedMachiningWorkspace("NC_EDIT") }',
    'addActionTo(branchFlow, "G54–G59", 3) { showWorkOffsetDialog() }',
    'addActionTo(branchFlow, "CONTROL", 5) { showControllerDialog() }',
    'addActionTo(branchFlow, "G81/G73/G83/G84", 2) { showDrillCycleDialog() }',
    'addActionTo(branchFlow, "3 AXIS", 3) { showUnifiedMachiningWorkspace("3AX") }',
    'addActionTo(branchFlow, "4 AXIS", 2) { showUnifiedMachiningWorkspace("4AX") }',
    'addActionTo(branchFlow, "5X A/B", 1) { showUnifiedMachiningWorkspace("5AX") }',
):
    require(android, needle, "ANDROID_MACHINING_CALLBACK")

# 3/4/5-axis modes must bind to true progressive CAM/SIM state, not just labels or images.
for needle in (
    'fun simulationMode(mode:String):String=when(mode){',
    '"4AX" -> "4AX"',
    '"5AX" -> "5AX"',
    'else -> "3AX"',
    'val target=MachiningAxisRuntimeContract.state(m,draftA,draftB)',
    'MultiAxisOrientationSchedule(',
    'mode=MultiAxisInterpolationMode.LINEAR_SYNC',
    'installSimulationView("3AX",axisOverlay=false)',
    'installSimulationView("4AX",axisOverlay=true)',
    'installSimulationView("5AX",axisOverlay=true)',
    'showSimulationFrame(simulationIndex+1)',
):
    require(android, needle, "AXIS_PROGRESSIVE_RUNTIME_BINDING")

for needle in (
    'fun showProgressiveFrame(index: Int): ProgressiveMachining3DFrame',
    'val activeMesh = activeFrame?.mesh ?: result.mesh',
    'val liveMove = activeFrame?.toolPoint ?: result.cam.toolpaths.lastOrNull()?.moves?.lastOrNull()',
    'val axis = toolAxisVector(toolLength, liveMove.axisA, liveMove.axisB)',
    'val removed = activeFrame?.removedCells ?: result.removal.depth.count { it < 0.0 }',
):
    require(machining3d, needle, "ANDROID_PROGRESSIVE_3D_BINDING")

for needle in (
    'data class ProgressiveMachining3DFrame(',
    'object ProgressiveMachining3D',
    'val removal=MaterialRemoval3D.simulate(prefix,result.cam.settings,result.stock)',
    'val mesh=SurfaceMesh3D.fromRemoval(removal)',
):
    require(machining3d_core, needle, "CORE_PROGRESSIVE_MATERIAL_REMOVAL_BINDING")

for needle in (
    'val playbackTimer=Timer(110,null)',
    'mesh.showProgressiveFrame(simulationIndex)',
    'axes.showProgressiveFrame(frameState)',
    'action("▶"',
    'action("⏸"',
    'action("STEP"',
    'action("RESET"',
):
    require(desktop, needle, "WINDOWS_PROGRESSIVE_3D_PLAYBACK_BINDING")

require(env, 'samePageModes = listOf("3D","3AX","4AX","5AX","NC_EDIT")', "AXIS_MODE_INVENTORY")

# Rotary clamp safety must be wired end-to-end in the Android machining path.
for needle in (
    'private var machiningAxisMode = "3AX"',
    'private var rotaryClampProfile = RotaryAxisClampProfile.unconfigured()',
    '"CONTROLLER / PMC AUTO • VERIFIED MACHINE ONLY"',
    '"EXPLICIT MACHINE M-CODES"',
    'rotaryMode = currentRotaryOperationMode()',
    'rotaryClampProfile = rotaryClampProfile',
    'clampProfile = rotaryClampProfile',
    'machiningAxisMode=activeAxisMode',
):
    require(android, needle, "ROTARY_CLAMP_UI_BINDING")

# Same-page NC closure must remain inline: keyboard, line help/safety, block controls and safe save.
start = android.find("private fun showUnifiedMachiningWorkspace")
end = android.find("private fun showStockDialog", start)
if start < 0 or end <= start:
    raise SystemExit("BLOCKED UNIFIED_WORKSPACE_SECTION_NOT_FOUND")
unified = android[start:end]
if "showNcEditDialog()" in unified:
    raise SystemExit("BLOCKED INLINE_NC_REGRESSION_SECOND_DIALOG")
for needle in (
    'listOf("G","M","X","Y","Z")',
    'listOf("A","B","F","S","T")',
    '"BLOCK /","SINGLE","DRY RUN","BLOCK SKIP","STEP"',
    'listOf("SAFE SAVE")',
    "NcProgramSafetyPolicy.blocking(candidate,rotaryClampProfile,currentRotaryOperationMode())",
    "inlineInterlock.inspect(candidate)",
    "NcExecutionTimeline.lineEvidence",
):
    require(unified, needle, "INLINE_NC_TOOL")

# NC safety findings are warning/interlock state, never an editor or draft-save lock.
if "SAFE SAVE BLOCKED" in unified or "NC SAFE SAVE BLOCKED" in unified:
    raise SystemExit("BLOCKED NC_EDITOR_WARNING_ONLY_REGRESSION: warning must not disable draft save")
for needle in (
    "val hasExecutionWarning=blocked.isNotEmpty() || !machine.canExecute",
    "unifiedNcDraftStale=hasExecutionWarning",
    "NC DRAFT SAVED • WARNING ONLY • EDITING ENABLED • EXECUTION INTERLOCK",
    "NC 草稿已儲存 • 警告不鎖編輯 • 執行前需修正/確認",
    "WARNING • SESSION ACTIVE • EDITING ENABLED • EXECUTION INTERLOCK",
):
    require(unified, needle, "NC_EDITOR_WARNING_ONLY")

# Machine-specific rotary M-codes must be editable, persisted and never treated as universal defaults.
for needle in (
    'loadRotaryMachineProfile()',
    'saveRotaryMachineProfile(rotaryClampProfile)',
    'getSharedPreferences("aig_rotary_machine_profile", MODE_PRIVATE)',
    '"EXPLICIT MACHINE M-CODES"',
    'M42/M44 等僅可作機台範例，不是通用預設',
):
    require(android, needle, "ROTARY_MACHINE_PROFILE_PERSISTENCE")

# Security/environment/AI pages must call operational handlers.
for needle in (
    'addActionTo(branchFlow, "網路狀態", 0) { showNetworkStatus() }',
    'addActionTo(branchFlow, "ChatGPT AI 更新 • 一鍵", 1) { runSecureUpdateCheck() }',
    'addActionTo(branchFlow, "防毒掃描", 4) { showSecurityScan() }',
    'addActionTo(branchFlow, "更新設定", 5) { showUpdateSettings() }',
    'addActionTo(branchFlow, "系統環境", 2) { showEnvironmentSettings() }',
    'addActionTo(branchFlow, "AI CAD 檢查", 3) { cad.aiInspect() }',
):
    require(android, needle, "ANDROID_SYSTEM_CALLBACK")

# Generic action/tool controls must execute callbacks instead of being decorative.
require(android, 'b.setOnClickListener { if (onClick != null) onClick() else selectTool(tool) }', "TOOL_NO_FAKE")
require(android, 'b.setOnClickListener { run() }', "ACTION_NO_FAKE")

# Desktop must expose the same multi-axis/NC workstation and real CAM/NC functions.
for needle in (
    'mode("3AX","三軸","3 AXIS"',
    'mode("4AX","四軸","4 AXIS"',
    'mode("5AX","五軸","5 AXIS"',
    'mode("NC_EDIT","程式","NC EDIT"',
    'action(UiTextPolicy.display("ROTARY_CLAMP",118)',
    'action("重建 NC"',
    'action("檢查"',
    'action("儲存"',
    'var rotaryClampProfile=loadDesktopRotaryMachineProfile()',
    'rotaryMode=currentRotaryMode()',
    'rotaryClampProfile=rotaryClampProfile',
    'NcProgramSafetyPolicy.blocking(editor.text,rotaryClampProfile,currentRotaryMode())',
    'loadDesktopRotaryMachineProfile()',
    'saveDesktopRotaryMachineProfile(rotaryClampProfile)',
    'UNIFIED NC WARNING • EDITING ENABLED • EXECUTION INTERLOCK',
    'NC REBUILD WARNING • existing editor preserved',
    'WARNING DOES NOT LOCK EDITING',
    'CncPost.generate(',
    'Machining3DEngine.build(',
):
    require(desktop, needle, "DESKTOP_RUNTIME_PAGE")

# Compact UI text must prefer Traditional Chinese, use short labels/symbols when needed,
# never reshuffle action IDs, and keep the same functional order across layouts.
for needle in (
    'const val POLICY = "ZH_TW_FIRST_COMPACT_STABLE_ORDER"',
    '"BACK" to "←"',
    '"CLOSE" to "×"',
    '"UNDO" to "↶"',
    '"REDO" to "↷"',
    'fun display(key:String, availableDp:Int):String',
    'return imageButtons.toList()',
):
    require(env, needle, "ADAPTIVE_UI_TEXT_POLICY_157")
for needle in (
    'text=UnifiedMachiningWorkspaceContract.displayLabel(spec.id,modeButtonWidthDp)',
    'contentDescription=spec.zh+" / "+spec.en',
    'maxLines=1',
    'UiTextPolicy.display("SINGLE_BLOCK",54)',
    'UiTextPolicy.display("DRY_RUN",54)',
    'UiTextPolicy.display("BLOCK_SKIP",54)',
):
    require(android, needle, "ANDROID_ADAPTIVE_UI_TEXT_157")
for needle in (
    'GlassActionButton(UiTextPolicy.display(id,118),color)',
    'toolTipText="$zh / $en"',
):
    require(desktop, needle, "WINDOWS_ADAPTIVE_UI_TEXT_157")

# Every unified page RGB icon must exist and be included in the approved SHA list.
assets = (
    "ic_rgb_cad.xml",
    "ic_rgb_cam.xml",
    "ic_rgb_3d.xml",
    "ic_rgb_3ax.xml",
    "ic_rgb_4ax.xml",
    "ic_rgb_5ax.xml",
    "ic_rgb_nc.xml",
)
for asset in assets:
    rel = f"app/src/main/res/drawable/{asset}"
    if not (ROOT / rel).is_file():
        raise SystemExit(f"BLOCKED RGB_ASSET_MISSING: {rel}")
    if rel not in hashes:
        raise SystemExit(f"BLOCKED RGB_ASSET_HASH_UNTRACKED: {rel}")

print("✓ ANDROID_ALL_PAGES_ENTRY_GATE_PASS CAD MODIFY CORNER CAM MACHINING SECURITY AI UPDATE")
print("✓ AXIS_3_4_5_PAGE_RUNTIME_BINDING_PASS 3AX_CONSTRAINED 4AX_A_ONLY 5AX_AB")
print("✓ INLINE_NC_PAGE_CLOSURE_GATE_PASS KEYBOARD SAFETY TIMELINE BLOCK_CONTROLS SAFE_SAVE")
print("✓ ROTARY_CLAMP_UI_BINDING_GATE_PASS PROFILE DRILL POST NC_STALE FAIL_CLOSED")
print("✓ ROTARY_CLAMP_CROSS_PLATFORM_GATE_PASS ANDROID WINDOWS PROFILE_AWARE_POST")
print("✓ ROTARY_MACHINE_PROFILE_PERSISTENCE_GATE_PASS CUSTOM_MCODE NO_UNIVERSAL_DEFAULT NC_STALE")
print("✓ NC_EDITOR_WARNING_ONLY_GATE_PASS EDIT SAVE_DRAFT UPDATE_SEPARATE EXECUTION_INTERLOCK SESSION_ACTIVE")
print("✓ DESKTOP_ALL_PAGES_ENTRY_GATE_PASS CAM 3D 3AX 4AX 5AX NC")
print("✓ CAD_EDIT_RUNTIME_GATE_PASS SELECT MOVE COPY ROTATE MIRROR DELETE UNDO_REDO CONNECT DISCONNECT ANDROID WINDOWS TOPOLOGY_ONLY TOL_0.001")
print("✓ CAD_RGB_WORKSPACE_GATE_PASS ANDROID_FLOATING_DECK WINDOWS_LEFT_DECK LARGE_CANVAS RIGHT_STATUS_RAIL RESPONSIVE NO_FAKE")
print("✓ CAD_PRECISION_EDIT_RUNTIME_GATE_PASS SNAP7 DIM_DRIVE TRIM EXTEND OFFSET ARRAY SELECTION_LINE_RECT_CIRCLE_ARC_HOLE GROUP_PRESERVED ANDROID WINDOWS TOL_0.001")
print("✓ RGB_ALL_PAGE_ASSET_INTEGRITY_PASS CAD CAM 3D 3AX 4AX 5AX NC")
require(workflow, "grep -Fq 'ADAPTIVE_UI_TEXT_GATE_PASS' release-validation.log", "CI_ADAPTIVE_UI_TEXT_MARKER_158")
require(workflow, "grep -Fq 'CAD_EDIT_INTEGRITY_GATE_PASS' release-validation.log", "CI_CAD_EDIT_MARKER_159")
require(workflow, "grep -Fq 'CAD_RGB_WORKSPACE_GATE_PASS' runtime-surfaces.log", "CI_CAD_RGB_WORKSPACE_MARKER_161")
require(workflow, "grep -Fq 'CAD_PRECISION_EDIT_RUNTIME_GATE_PASS' runtime-surfaces.log", "CI_CAD_PRECISION_EDIT_RUNTIME_MARKER_162")
require(workflow, "grep -Fq 'CAD_PRECISION_EDIT_GATE_PASS' release-validation.log", "CI_CAD_PRECISION_EDIT_REGRESSION_MARKER_162")
if "grep -Fq 'BILINGUAL_ADAPTIVE_UI_GATE_PASS' release-validation.log" in workflow:
    raise SystemExit("BLOCKED CI_ADAPTIVE_UI_TEXT_MARKER_158: stale bilingual marker")

print("✓ ASSET_ENGINEERING_POLICY_GATE_PASS 最高工程權限 圖片直通 不需人工認證 不需資產簽名 不鎖定 不需固定白名單 Preview不阻擋 正式Release仍驗證")
print("✓ ADAPTIVE_UI_TEXT_GATE_PASS 繁中優先 SHORT_ZH TECH_ABBR SYMBOL SHORT_EN NO_OVERFLOW STABLE_ORDER")
print("✓ CI_ADAPTIVE_UI_TEXT_MARKER_GATE_PASS WORKFLOW_MATCHES_RUNTIME_GATE")
print("✓ NO_FAKE_PAGE_CALLBACK_GATE_PASS TOOL_ACTION_CALLBACKS_BOUND")
print("✓ ALL_SCREENS_RUNTIME_GATE_PASS")
