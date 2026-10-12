from pathlib import Path

R = Path(__file__).resolve().parents[1]
home_path = R / "feature-home/src/main/kotlin/com/aig/feature/home/HomeFeatureView.kt"
main_path = R / "app/src/main/kotlin/com/aig/fifth432/MainActivity.kt"

home = home_path.read_text(encoding="utf-8")
main = main_path.read_text(encoding="utf-8")

failures = []

# HOME must be a live runtime surface, never a screenshot-like full-screen UI skin.
if "setImageResource(UiR.drawable.aig_home)" in home:
    failures.append("HOME_FULL_UI_IMAGE_FORBIDDEN")
if "FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT,FrameLayout.LayoutParams.MATCH_PARENT)" in home:
    failures.append("HOME_FULL_SCREEN_IMAGE_LAYER_FORBIDDEN")
if "Gravity.BOTTOM" in home and "UiKit.panel" in home:
    failures.append("HOME_BOTTOM_OVERLAY_CARD_FORBIDDEN")

# Formal HOME must not expose implementation/debug wording to the operator.
for bad in [
    "One Scene", "One Renderer", "No Overlay", "Runtime 狀態", "Renderer", "工程殼",
    "正式 Runtime HOME", "OpenGL ES", "VERTICAL ONLY", "不使用整張 UI 截圖"
]:
    if bad in home:
        failures.append("HOME_ENGINEERING_TEXT_FORBIDDEN:" + bad.replace(" ", "_"))

# MainActivity must be a host, not a permanently visible engineering shell.
for bad in [
    'val header=UiKit.panel',
    '"434.0.0"',
    '"Android 官方 Runtime"',
    'repeat(2){r->',
    'root.addView(UiKit.statusLabel'
]:
    if bad in main:
        failures.append("TOP_ENGINEERING_SHELL_FORBIDDEN:" + bad.replace(" ", "_"))

# Navigation must still be real and unique.
for tab in ["HOME", "CAD", "CAM", "SIM", "3AX", "4AX", "5AX", "6AX", "NC", "AI"]:
    if main.count(f'"{tab}"') == 0:
        failures.append(f"MISSING_REAL_NAV_{tab}")

if failures:
    raise SystemExit("AIG_435_SINGLE_LAYER_UI_FAIL|" + "|".join(failures))

print("AIG_435_SINGLE_LAYER_UI_PASS")
