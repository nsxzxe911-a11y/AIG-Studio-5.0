import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PAGES=["HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"]
NAV={f"NAV_{p}":p for p in PAGES}

def read(path): return (ROOT/path).read_text(encoding="utf-8")

def manifest_routes():
    routes={}
    for page in PAGES:
        doc=json.loads(read(Path("design/ui/pages")/page/"button-manifest.json"))
        for b in doc["buttons"]:
            bid=b["buttonId"]
            assert bid not in routes,f"DUPLICATE_BUTTON:{bid}"
            routes[bid]=(b["pageId"],b["subpageId"],b["commandId"])
    return routes

def web_inventory():
    js=(ROOT/"web/runtime/page-runtime-router.js").as_posix()
    code=(
        "require("+json.dumps(js)+");"
        "console.log(JSON.stringify({pages:globalThis.AIG_PAGE_IDS,nav:globalThis.AIG_PAGE_NAVIGATION,"
        "routes:Object.fromEntries(Object.entries(globalThis.AIG_PAGE_COMMAND_ROUTES).map(([k,v])=>[k,[v.pageId,v.subpageId,v.commandId]]))}));"
    )
    result=subprocess.run(["node","-e",code],cwd=ROOT,text=True,capture_output=True,check=True)
    return json.loads(result.stdout.strip())

def verify_web_ai_strict_reuse():
    result=subprocess.run(
        ["node",str(ROOT/"ci/verify_web_ai_strict_reuse.mjs")],
        cwd=ROOT,text=True,capture_output=True,check=True,
    )
    marker=result.stdout.strip()
    assert marker=="WEB_AI_STRICT_REUSE_PASS|VERIFIED|PREFLIGHT|FIXTURE_COVERAGE|LEGACY_REJECTED",marker

def main():
    expected=manifest_routes()
    android_router=read(Path("app/src/main/java/com/aigstudio/app/PageRuntimeRouter.kt"))
    desktop_router=read(Path("desktop/src/main/kotlin/com/aigstudio/desktop/PageRuntimeRouter.kt"))
    android_ui=read(Path("app/src/main/java/com/aigstudio/app/MainActivity.kt"))
    desktop_ui=read(Path("desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt"))
    web_index=read(Path("web/index.html"))
    web_ai=read(Path("web/runtime/ai-page-runtime.js"))

    for name,source in (("ANDROID",android_router),("WINDOWS",desktop_router)):
        for nav_id,page in NAV.items():
            assert f'"{nav_id}" to PageId.' in source,f"{name}_NAV_MISSING:{nav_id}"
        assert "PageCommandCatalog.requireDefinition(buttonId)" in source,f"{name}_CATALOG_BINDING_MISSING"
        assert "runtime.dispatch(PageCommand(" in source,f"{name}_RUNTIME_DISPATCH_MISSING"
        assert "runtime.messages().drop(before)" in source,f"{name}_LOCAL_MESSAGE_ROUTING_MISSING"

    web=web_inventory()
    assert web["pages"]==PAGES,f"WEB_PAGE_ID_DRIFT:{web['pages']}"
    assert web["nav"]==NAV,f"WEB_NAV_DRIFT:{web['nav']}"
    actual_web={k:tuple(v) for k,v in web["routes"].items()}
    assert actual_web==expected,(
        "WEB_BUTTON_ROUTE_DRIFT:missing="+str(sorted(set(expected)-set(actual_web)))+
        ":extra="+str(sorted(set(actual_web)-set(expected)))
    )

    # Integration assertions: router files do not count until production surfaces call them.
    assert "PageRuntimeRouter(" in android_ui,"ANDROID_ROUTER_NOT_INTEGRATED"
    assert 'Toast.makeText(this,"CAD • LIVE WORKSPACE"' not in android_ui,"ANDROID_NAV_CAD_STILL_TOAST_ONLY"
    assert "productionPageRouter?.navigate(navId)" in android_ui,"ANDROID_NAV_NOT_ROUTED"
    assert "PageRuntimeRouter(" in desktop_ui,"WINDOWS_ROUTER_NOT_INTEGRATED"
    assert "productionPageRouter?.navigate(navId)" in desktop_ui,"WINDOWS_NAV_NOT_ROUTED"
    assert 'runtime/page-runtime-router.js' in web_index,"WEB_ROUTER_SCRIPT_NOT_LOADED"
    assert '["AI","#' in web_index or "['AI','#" in web_index,"WEB_AI_PAGE_MISSING"
    assert "new AigPageRuntimeRouter" in web_index,"WEB_ROUTER_NOT_INTEGRATED"
    assert "navigateProductionPage(name)" in web_index,"WEB_NAV_NOT_ROUTED"
    assert "productionPageRouter.navigate(navId)" in web_index,"WEB_NAV_NOT_ROUTED_THROUGH_ROUTER"

    for token in ["preflightReady","fixtureCoverageKnown","SIM_PREFLIGHT_READY_REQUIRED","SIM_FIXTURE_COVERAGE_REQUIRED","safeSimReuse"]:
        assert token in web_ai,f"WEB_AI_STRICT_REUSE_TOKEN_MISSING:{token}"
    verify_web_ai_strict_reuse()

    print(f"PAGE_RUNTIME_CROSS_PLATFORM_PASS|10_PAGES|{len(expected)}_BUTTONS|ANDROID|WINDOWS|WEB|NAV_AND_COMMAND_IDS|REAL_ROUTER_INTEGRATION|WEB_AI_STRICT_REUSE")

if __name__=="__main__": main()
