from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "app/src/main/java/com/aigstudio/app/MainActivity.kt"

OLD = '        addProductionUi("CAD") { enterCadRuntime() }'
NEW = '''        addProductionUi("CAD") {
            root.visibility=View.VISIBLE
            selectProductionUi("CAD")
            refreshVisibleMode("CAD")
        }'''

text = MAIN.read_text(encoding="utf-8")
if OLD in text:
    text = text.replace(OLD, NEW, 1)
MAIN.write_text(text, encoding="utf-8")

final = MAIN.read_text(encoding="utf-8")
assert 'Toast.makeText(this,"CAD • LIVE WORKSPACE"' not in final, "ANDROID_NAV_CAD_TOAST_STILL_PRESENT"
assert OLD not in final, "ANDROID_CAD_FORWARD_REFERENCE_STILL_PRESENT"
assert NEW in final, "ANDROID_CAD_INLINE_FALLBACK_MISSING"
assert "productionPageRouter?.navigate(navId)" in final, "ANDROID_PRODUCTION_NAV_ROUTER_MISSING"
print("PAGE_RUNTIME_ROUTER_ANDROID_FINALIZE_PASS|NO_TOAST|NO_FORWARD_REFERENCE|IN_SCOPE_CAD_FALLBACK")
