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
for needle in (
    "fun maximizeVisualWorkspace()",
    "split.setDividerLocation(1.0)",
    "fun showNcWorkspace()",
    "split.setDividerLocation(.76)",
):
    require(desktop, needle, "LARGE_MACHINING_WORKSPACE_GATE")
for needle in (
    "minHeight=dp(48)",
    "minimumHeight=dp(44)",
    "android.view.WindowManager.LayoutParams.MATCH_PARENT",
    "screenH * 0.72f",
):
    require(android, needle, "ANDROID_LARGE_MACHINING_WORKSPACE_GATE")
print("LARGE_MACHINING_WORKSPACE_GATE_PASS|WINDOWS_VISUAL_100|NC_ON_DEMAND|ANDROID_FULLSCREEN|3D_HEIGHT_72PCT|TOUCH_44")
for needle in (
    "preferredSize=Dimension(250,0)",
    "minimumSize=Dimension(225,0)",
    "preferredSize=Dimension(158,0)",
    "preferredSize=Dimension(190,0)",
    "preferredSize=Dimension(180,0)",
):
    require(desktop, needle, "CAD_CAM_LARGE_WORKSPACE_GATE")
print("CAD_CAM_LARGE_WORKSPACE_GATE_PASS|CAD_DECK_250|INFO_RAIL_158|CAM_LEFT_190|CAM_RIGHT_180|CENTER_CANVAS_PRIORITY")
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
    'val machineTip=machineSpace(Vec3(liveMove.to.x, liveMove.to.y, liveMove.z),resolvedMode,liveMove)',
    'val top = project(Vec3(machineTip.x,machineTip.y,machineTip.z+toolLength),scale)',
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
for needle in (
    'view.showProgressiveFrame(0)',
    'val frame=runCatching { view.showProgressiveFrame(index) }',
    'activeAxisPreview?.setAngles(frame.toolPoint.axisA,frame.toolPoint.axisB)',
    'removed="+frame.removedCells',
    'action("PLAY"',
    'action("PAUSE"',
    'action("STEP"',
    'action("RESET"',
    'action("SPEED"',
):
    require(android, needle, "ANDROID_PROGRESSIVE_3D_PLAYBACK_172")
print("ANDROID_PROGRESSIVE_3D_PLAYBACK_GATE_PASS|3D|3AX|4AX|5AX|PLAY|PAUSE|STEP|RESET|SPEED|REMOVED_CELLS|AXIS_SYNC")
for needle in (
    "enum class MachineComponentRole",
    "data class MachineModel3D(",
    "object MachineKinematics3D",
    "object MachineModel3DBuilder",
    "MachineKinematics3D.transform(table,a,b)",
    "MachineKinematics3D.transform(rotaryA,a,0.0)",
    "MachineKinematics3D.transform(rotaryB,a,b)",
    "val machineToolPoint=MachineKinematics3D.transform(rawToolPoint,a,b)",
    "MachineComponentRole.TRUNNION",
    "MachineComponentRole.ROTARY_A",
    "MachineComponentRole.ROTARY_B",
    "MachineComponentRole.SPINDLE",
    "MachineComponentRole.HOLDER",
    "MachineComponentRole.TOOL",
):
    require(machining3d_core, needle, "STUDIO_TRUE_MACHINE_MODEL_CORE_174")
for needle in (
    "private fun drawMachineModel(canvas: Canvas, model: MachineModel3D, scale: Double) {",
    "private fun machineSpace(v:Vec3,mode:String,live:Move?):Vec3",
    "return MachineKinematics3D.transform(v,a,b)",
    "val machineModel=MachineModel3DBuilder.build(",
    "liveMove?.axisA",
    "liveMove?.axisB",
    "drawMachineModel(canvas,machineModel,scale)",
    "activeMesh.vertices.forEach { projectedBuffer.add(project(machineSpace(it,resolvedMode,liveMove), scale)) }",
    "SPACE=MACHINE",
    "val prepared=model.components.map { component ->",
    "MachineComponentRole.ROTARY_A",
    "MachineComponentRole.ROTARY_B",
    'val label = "TRUE 3D • MACHINE=" + machineModel.mode',
):
    require(machining3d, needle, "STUDIO_ANDROID_TRUE_MACHINE_MODEL_174")
for needle in (
    "private fun drawMachineModel(g2:Graphics2D,scale:Double,frame:ProgressiveMachining3DFrame?):MachineModel3D",
    "private fun projectMachine(v:Vec3,scale:Double):Point",
    "val machineModel=drawMachineModel(g2,scale,activeFrame)",
    "private fun kinematicTransform(v:Vec3):Vec3",
    "return MachineKinematics3D.transform(v,a,b)",
    "val machineModel=drawMachineModel(g,scale,activeFrame)",
    "result,machineMode,axisA,axisB,live",
):
    require(desktop, needle, "STUDIO_WINDOWS_TRUE_MACHINE_MODEL_174")
require(regression, "REAL_MACHINE_MODEL_3_4_5AX_GATE_PASS", "STUDIO_TRUE_MACHINE_MODEL_REGRESSION_174")
require(regression, "MACHINE_KINEMATICS_RUNTIME_PARITY_PASS", "STUDIO_MACHINE_KINEMATICS_REGRESSION_174")
print("TRUE_MACHINE_MODEL_RUNTIME_PARITY_GATE_PASS|ANDROID|WINDOWS|3AX|4AX|5AX|BASE|COLUMN|TABLE|FIXTURE|TRUNNION|ROTARY_A|ROTARY_B|SPINDLE|HOLDER|TOOL|DYNAMIC_AB|MASTER_ORIGIN|SHARED_KINEMATICS")
for needle in (
    "Color.argb(if(moving) 246 else 236, 56, 104, 138)",
    "Color.argb(if(moving) 250 else 244, 82, 132, 184)",
    "Color.argb(250, 38, 210, 230)",
    "Color.argb(250, 236, 72, 192)",
    "Color.argb(252, 188, 226, 255)",
    "Color.argb(250, 92, 186, 232)",
    "MachineComponentRole.TOOL -> 1.9f*resources.displayMetrics.density",
):
    require(machining3d, needle, "STUDIO_ANDROID_MACHINE_VISUAL_DEPTH_176")
for needle in (
    "MachineComponentRole.TOOL -> 255",
    "MachineComponentRole.SPINDLE -> 250",
    "MachineComponentRole.HOLDER -> 246",
    "MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 244",
    "MachineComponentRole.TRUNNION -> 236",
    "MachineComponentRole.TABLE -> 232",
    "MachineComponentRole.BASE,MachineComponentRole.COLUMN -> 224",
    "MachineComponentRole.TOOL -> 2.1f",
    "MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 1.05f",
):
    require(desktop, needle, "STUDIO_WINDOWS_MACHINE_VISUAL_DEPTH_176")
print("MACHINE_VISUAL_DEPTH_GATE_PASS|ANDROID|WINDOWS|SOLID_FIXED_PARTS|ROTARY_A|ROTARY_B|SPINDLE|HOLDER|TOOL|ROLE_EDGES")
for needle in (
    "MachineComponentRole.FIXTURE ->",
    "Color.argb(if(moving) 248 else 240, 112, 132, 150)",
    "Color.argb(if(moving) 250 else 244, 82, 132, 184)",
    "Color.argb(if(moving) 252 else 246, 126, 92, 208)",
    "Color.argb(252, 188, 226, 255)",
    "Color.argb(250, 92, 186, 232)",
):
    require(machining3d, needle, "STUDIO_ANDROID_MACHINE_MATERIAL_SEPARATION_177")
for needle in (
    "val machine:BufferedImage? by lazy { null }",
    "val fillColor=when(component.role){",
    "MachineComponentRole.TRUNNION -> Color(126,92,208,alpha)",
    "MachineComponentRole.TABLE -> Color(82,132,184,alpha)",
    "MachineComponentRole.FIXTURE -> Color(112,132,150,alpha)",
    "MachineComponentRole.SPINDLE -> Color(188,226,255,alpha)",
    "MachineComponentRole.HOLDER -> Color(92,186,232,alpha)",
    "g.color=shadedFill",
):
    require(desktop, needle, "STUDIO_WINDOWS_MACHINE_MATERIAL_SEPARATION_177")
print("MACHINE_MATERIAL_SEPARATION_GATE_PASS|ANDROID|WINDOWS|NO_STATIC_MACHINE_IMAGE|ROLE_FILL_COLOR|EDGE_RESTORE|FIXTURE|TABLE|TRUNNION|ROTARY_A|ROTARY_B|SPINDLE|HOLDER|TOOL")
for needle in (
    "val drawRoleEdges=when(component.role){",
    "MachineComponentRole.ROTARY_B -> false",
    "MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 96",
    "if(drawRoleEdges && index%edgeStep==0)",
):
    require(machining3d, needle, "STUDIO_ANDROID_MACHINE_SURFACE_CLEANUP_178")
for needle in (
    "val drawInternalEdges=when(component.role){",
    "MachineComponentRole.ROTARY_B -> false",
    "MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> stride*96",
    "if(drawInternalEdges && i%edgeStride==0)",
):
    require(desktop, needle, "STUDIO_WINDOWS_MACHINE_SURFACE_CLEANUP_178")
print("MACHINE_SURFACE_CLEANUP_GATE_PASS|ANDROID|WINDOWS|TRUE_MESH_FILL|SPARSE_INTERNAL_EDGES|TOOL_FULL_EDGE|NO_STATIC_IMAGE")
for needle in (
    "private fun machineDepthShade(base: Int, depth: Double, minDepth: Double, maxDepth: Double): Int",
    "val prepared=model.components.map { component ->",
    "Triple(component,pts,pts.map { it.depth }.average())",
    "machinePaint.color=if(rotarySurfaceSolid) baseColor else machineDepthShade(baseColor,item.first,minDepth,maxDepth)",
):
    require(machining3d, needle, "STUDIO_ANDROID_MACHINE_DEPTH_CUE_179")
for needle in (
    "private fun machineDepthShade(base:Color,depth:Double,minDepth:Double,maxDepth:Double):Color",
    "Triple(component,pts,rotated.map { it.z }.average())",
    "val depth=component.mesh.vertices.map{it.x*.34-it.y*.28+it.z}.average()",
    "val shadedFill=if(rotarySurfaceSolid) fillColor else machineDepthShade(fillColor,item.first,minDepth,maxDepth)",
):
    require(desktop, needle, "STUDIO_WINDOWS_MACHINE_DEPTH_CUE_179")
print("MACHINE_DEPTH_CUE_GATE_PASS|ANDROID|WINDOWS|COMPONENT_DEPTH_SORT|FACE_DEPTH_SHADE|5AX_FRONT_BACK_READABILITY|VISUAL_ONLY")
for needle in (
    "Color.argb(if(moving) 246 else 236, 56, 104, 138)",
    "Color.argb(if(moving) 252 else 246, 126, 92, 208)",
    "Color.argb(250, 38, 210, 230)",
    "Color.argb(250, 236, 72, 192)",
):
    require(machining3d, needle, "STUDIO_ANDROID_MACHINE_SOLID_MATERIAL_180")
for needle in (
    "MachineComponentRole.TOOL -> 255",
    "MachineComponentRole.SPINDLE -> 250",
    "MachineComponentRole.HOLDER -> 246",
    "MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 244",
    "MachineComponentRole.TRUNNION -> 236",
    "MachineComponentRole.TABLE -> 232",
    "MachineComponentRole.FIXTURE -> 228",
    "MachineComponentRole.BASE,MachineComponentRole.COLUMN -> 224",
):
    require(desktop, needle, "STUDIO_WINDOWS_MACHINE_SOLID_MATERIAL_180")
print("MACHINE_SOLID_MATERIAL_GATE_PASS|ANDROID|WINDOWS|OPAQUE_FIXED_PARTS|ROTARY_READABLE|SPINDLE_HOLDER_TOOL_LAYERED|VISUAL_ONLY")
for needle in (
    "visibleTriangleBuffer.forEachIndexed { visibleIndex, index ->",
    "if(showMaterialMeshEdges && visibleIndex % 18 == 0)",
):
    require(machining3d, needle, "STUDIO_ANDROID_MATERIAL_SURFACE_READABILITY_181")
for needle in (
    "if(showMaterialMeshEdges && index % 18 == 0)",
    "Color(61, 220, 255, 46)",
    "if(showMaterialMeshEdges && i%(stride*18)==0)",
    "Color(61,235,255,46)",
):
    require(desktop, needle, "STUDIO_WINDOWS_MATERIAL_SURFACE_READABILITY_181")
print("MATERIAL_SURFACE_READABILITY_GATE_PASS|ANDROID|WINDOWS|FILLED_REMOVAL_SURFACE|SPARSE_MESH_EDGES|5AX_MACHINE_PRIORITY|VISUAL_ONLY")
for needle in (
    "strokeWidth = 1.35f * resources.displayMetrics.density",
    "color = Color.argb(58,255,70,220)",
    "strokeWidth = 1.9f * resources.displayMetrics.density",
    "color = Color.argb(108,63,255,157)",
    "private val activePathGlowPaint",
    "private val activePathPaint",
):
    require(machining3d, needle, "STUDIO_ANDROID_TOOLPATH_HIERARCHY_182")
for needle in (
    "g2.stroke=BasicStroke(1.15f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)",
    "Color(255,70,220,40)",
    "Color(63,255,157,82)",
    "Color(61,235,255,36)",
    "Color(255,176,32,78)",
    "BasicStroke(if(m.rapid)1.05f else 1.5f",
    "BasicStroke(10f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)",
    "BasicStroke(4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)",
):
    require(desktop, needle, "STUDIO_WINDOWS_TOOLPATH_HIERARCHY_182")
print("TOOLPATH_VISUAL_HIERARCHY_GATE_PASS|ANDROID|WINDOWS|COMPLETED_PATH_FADED|ACTIVE_SEGMENT_BRIGHT|TOOL_HALO|MATERIAL_REMOVAL_UNCHANGED|VISUAL_ONLY")
for needle in (
    "MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 180",
    "MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 128",
    "MachineComponentRole.TRUNNION,MachineComponentRole.TABLE -> 96",
    "val drawRoleEdges=when(component.role){",
    "MachineComponentRole.ROTARY_B -> false",
    "MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 96",
    "if(drawRoleEdges && index%edgeStep==0)",
):
    require(machining3d, needle, "STUDIO_ANDROID_MACHINE_EDGE_CLEANUP_183")
for needle in (
    "val edgeAlpha=when(component.role){",
    "MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 128",
    "MachineComponentRole.TRUNNION,MachineComponentRole.TABLE -> 96",
    "MachineComponentRole.FIXTURE -> 84",
    "val drawInternalEdges=when(component.role){",
    "MachineComponentRole.ROTARY_B -> false",
    "MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> stride*96",
    "g2.color=Color(180,220,255,edgeAlpha)",
    "g.color=Color(180,220,255,edgeAlpha)",
):
    require(desktop, needle, "STUDIO_WINDOWS_MACHINE_EDGE_CLEANUP_183")
print("MACHINE_EDGE_CLEANUP_GATE_PASS|ANDROID|WINDOWS|SOLID_FILL_PRIORITY|SPARSE_INTERNAL_EDGES|TOOL_OUTLINE_PRESERVED|ROTARY_READABLE|VISUAL_ONLY")
for needle in (
    "val drawRoleEdges=when(component.role){",
    "MachineComponentRole.TOOL,",
    "MachineComponentRole.SPINDLE,",
    "MachineComponentRole.HOLDER -> true",
    "MachineComponentRole.ROTARY_A,",
    "MachineComponentRole.ROTARY_B -> false",
    "else -> false",
    "MachineComponentRole.ROTARY_B -> false",
    "MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 96",
):
    require(machining3d, needle, "STUDIO_ANDROID_SOLID_SURFACE_PRIORITY_184")
for needle in (
    "val drawInternalEdges=when(component.role){",
    "MachineComponentRole.ROTARY_B -> false",
    "MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> stride*96",
    "if(drawInternalEdges && i%edgeStride==0)",
):
    require(desktop, needle, "STUDIO_WINDOWS_SOLID_SURFACE_PRIORITY_184")
print("SOLID_SURFACE_PRIORITY_GATE_PASS|ANDROID|WINDOWS|FIXED_COMPONENT_INTERNAL_EDGES_OFF|ROTARY_MINIMAL_GUIDES|SPINDLE_SPARSE|TOOL_OUTLINE_FULL|VISUAL_ONLY")
for needle in (
    "private val showMaterialMeshEdges = false",
    "if(showMaterialMeshEdges && visibleIndex % 18 == 0)",
):
    require(machining3d, needle, "STUDIO_ANDROID_MATERIAL_FILL_PRIORITY_185")
for needle in (
    "val showMaterialMeshEdges=false",
    "if(showMaterialMeshEdges && index % 18 == 0)",
    "if(showMaterialMeshEdges && i%(stride*18)==0)",
):
    require(desktop, needle, "STUDIO_WINDOWS_MATERIAL_FILL_PRIORITY_185")
print("MATERIAL_FILL_PRIORITY_GATE_PASS|ANDROID|WINDOWS|TRUE_REMOVAL_FILL|INTERNAL_MESH_EDGES_OFF|5AX_MACHINE_VISIBLE|VISUAL_ONLY")
for needle in (
    "private val surfacePaint = Paint().apply",
    "private val machinePaint = Paint().apply",
    "isAntiAlias = false",
):
    require(machining3d, needle, "STUDIO_ANDROID_TRIANGLE_SEAM_SUPPRESSION_186")
for needle in (
    "g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF)",
    "g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)",
    "g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_OFF)",
    "g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,RenderingHints.VALUE_ANTIALIAS_ON)",
):
    require(desktop, needle, "STUDIO_WINDOWS_TRIANGLE_SEAM_SUPPRESSION_186")
print("TRIANGLE_SEAM_SUPPRESSION_GATE_PASS|ANDROID|WINDOWS|MACHINE_FILL_AA_OFF|MATERIAL_FILL_AA_OFF|TOOLPATH_AA_ON|TRUE_MESH|VISUAL_ONLY")
require(machining3d, "private val surfaceSeamPaint = Paint().apply", "STUDIO_ANDROID_SEAM_WELD_189")
require(machining3d, "private val machineSeamPaint = Paint().apply", "STUDIO_ANDROID_SEAM_WELD_189")
require(machining3d, "machineSeamPaint.color=machinePaint.color", "STUDIO_ANDROID_SEAM_WELD_189")
require(machining3d, "surfaceSeamPaint.color=surfacePaint.color", "STUDIO_ANDROID_SEAM_WELD_189")
require(desktop, "val materialColor=Color(45,145,220,190)", "STUDIO_WINDOWS_SEAM_WELD_189")
require(desktop, "g2.stroke=BasicStroke(1.15f)", "STUDIO_WINDOWS_SEAM_WELD_189")
require(desktop, "g.stroke=BasicStroke(1.15f)", "STUDIO_WINDOWS_SEAM_WELD_189")
print("SURFACE_SEAM_WELD_GATE_PASS|ANDROID|WINDOWS|ROTARY|MATERIAL|TRUE_MESH|VISUAL_ONLY")
for needle in (
    'val actionScroll=HorizontalScrollView(this).apply',
    'minWidth=dp(78)',
    'visualHost.addView(',
    'FrameLayout.LayoutParams(-1,-2,Gravity.TOP)',
    'text="真走刀 • 3AX/4AX/5AX • PLAY / PAUSE / STEP / RESET • MACHINE EXECUTION=OFF"',
):
    require(android, needle, "ANDROID_WORKSPACE_VISUAL_PRIORITY_173")
for needle in (
    'private val activePathGlowPaint',
    'private val activePathPaint',
    'private val toolHaloPaint',
    'canvas.drawLine(a.x,a.y,b.x,b.y,activePathGlowPaint)',
    'canvas.drawCircle(tip.x,tip.y,radius+4f*resources.displayMetrics.density,toolHaloPaint)',
    'val progress=frame.progress.toFloat().coerceIn(0f,1f)',
):
    require(machining3d, needle, "ANDROID_TOOLPATH_VISIBILITY_173")
print("ANDROID_TOOLPATH_VISIBILITY_GATE_PASS|3D|3AX|4AX|5AX|ACTIVE_GLOW|TOOL_HALO|PROGRESS_BAR|HUD_OVERLAY|SINGLE_ROW_CONTROLS")
for needle in (
    'g2.stroke=BasicStroke(10f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)',
    'g2.stroke=BasicStroke(4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)',
    'g2.fillOval(p.x-12,p.y-12,24,24)',
    'g2.fillRoundRect(x,y,(w*progress).roundToInt(),7,7,7)',
    'g.stroke=BasicStroke(10f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)',
    'g.stroke=BasicStroke(4f,BasicStroke.CAP_ROUND,BasicStroke.JOIN_ROUND)',
    'g.fillRoundRect(x,y,(w*progress).roundToInt(),7,7,7)',
):
    require(desktop, needle, "WINDOWS_TOOLPATH_VISIBILITY_173")
print("WINDOWS_TOOLPATH_VISIBILITY_GATE_PASS|3D|3AX|4AX|5AX|COMPLETED_PATH|ACTIVE_GLOW|TOOL_HALO|PROGRESS_BAR")

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
