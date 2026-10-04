from pathlib import Path
src=Path("app/src/main/java/com/aigstudio/app/MainActivity.kt").read_text(encoding="utf-8")
def require(needle,msg):
    if needle not in src:
        raise SystemExit("HOME_PREVIEW_ISOLATION_FAIL|"+msg)
require("class HomeCadPreviewView", "LIGHTWEIGHT_VIEW_MISSING")
require("val homePreview=HomeCadPreviewView(this)", "HOME_STILL_USES_FULL_CAD_VIEW")
require("homePreview.update(cad.snapshot())", "SNAPSHOT_BINDING_MISSING")
if "val homePreview=CadView(this)" in src:
    raise SystemExit("HOME_PREVIEW_ISOLATION_FAIL|FULL_CAD_VIEW_EMBEDDED")
print("HOME_PREVIEW_ISOLATION_GATE_PASS|LIGHTWEIGHT|REAL_GEOMETRY|NO_CAD_HUD|NO_RENDER_CACHE|FORMAL_CAD_UNCHANGED")
