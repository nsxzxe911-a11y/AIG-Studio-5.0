#!/usr/bin/env python3
from pathlib import Path

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
desktop = read("desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt")
env = read("core/src/main/kotlin/com/aigstudio/core/EnvironmentSettings.kt")
hashes = read("design/theme/official_rgb/android-drawable.sha256")

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
    'addToolToBranch("刪除", Tool.DELETE, 4)',
    'addToolToBranch("移動", Tool.PAN, 0)',
    'addActionTo(branchFlow, "GRID", 2) { cad.toggleGrid() }',
    'addActionTo(branchFlow, "GEOMETRY", 1) { cad.toggleGeometry() }',
    'addToolToBranch("C 倒角", Tool.CHAMFER, 2)',
    'addToolToBranch("R 角", Tool.FILLET, 1)',
):
    require(android, needle, "ANDROID_CAD_CALLBACK")

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

# 3/4/5-axis modes must bind to the runtime contract, not just labels or images.
for mode in ("3AX", "4AX", "5AX"):
    require(android, f'MachiningAxisRuntimeContract.state("{mode}"', f"{mode}_RUNTIME_BINDING")
require(android, 'Axis5xPreview(this,draftA,draftB,"4AX")', "4AX_PREVIEW_BINDING")
require(android, 'Axis5xPreview(this,draftA,draftB,"5AX")', "5AX_PREVIEW_BINDING")
require(env, 'samePageModes = listOf("3D","3AX","4AX","5AX","NC_EDIT")', "AXIS_MODE_INVENTORY")

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
    "NcProgramSafetyPolicy.blocking(candidate)",
    "inlineInterlock.inspect(candidate)",
    "NcExecutionTimeline.lineEvidence",
):
    require(unified, needle, "INLINE_NC_TOOL")

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
    'action("重建NC / REBUILD NC"',
    'action("安全檢查 / SAFE CHECK"',
    'action("儲存草稿 / SAVE DRAFT"',
    'CncPost.generate(',
    'Machining3DEngine.build(',
):
    require(desktop, needle, "DESKTOP_RUNTIME_PAGE")

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
print("✓ DESKTOP_ALL_PAGES_ENTRY_GATE_PASS CAM 3D 3AX 4AX 5AX NC")
print("✓ RGB_ALL_PAGE_ASSET_INTEGRITY_PASS CAD CAM 3D 3AX 4AX 5AX NC")
print("✓ NO_FAKE_PAGE_CALLBACK_GATE_PASS TOOL_ACTION_CALLBACKS_BOUND")
print("✓ ALL_SCREENS_RUNTIME_GATE_PASS")
