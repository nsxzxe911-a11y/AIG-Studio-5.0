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
            assert b["viewId"]==f"VIEW.{bid}",f"VIEW_BUTTON_DRIFT:{b['viewId']}:{bid}"
            assert bid==b["commandId"],f"BUTTON_COMMAND_DRIFT:{bid}:{b['commandId']}"
            routes[bid]=(b["viewId"],b["pageId"],b["subpageId"],b["commandId"])
    return routes


def web_inventory():
    js=(ROOT/"web/runtime/page-runtime-router.js").as_posix()
    code=(
        "require("+json.dumps(js)+");"
        "console.log(JSON.stringify({pages:globalThis.AIG_PAGE_IDS,nav:globalThis.AIG_PAGE_NAVIGATION,"
        "routes:Object.fromEntries(Object.entries(globalThis.AIG_PAGE_COMMAND_ROUTES).map(([k,v])=>[k,[v.viewId,v.pageId,v.subpageId,v.commandId]]))}));"
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
    web_router=read(Path("web/runtime/page-runtime-router.js"))
    web_ai=read(Path("web/runtime/ai-page-runtime.js"))

    for name,source in (("ANDROID",android_router),("WINDOWS",desktop_router)):
        for nav_id,page in NAV.items():
            assert f'"{nav_id}" to PageId.' in source,f"{name}_NAV_MISSING:{nav_id}"
        for token in [
            "PageCommandCatalog.requireDefinition(buttonId)",
            "runtime.dispatch(PageCommand(",
            "runtime.messages().drop(before)",
            "fun navigateView(",
            "fun dispatchView(",
            "UiDualIdContract.navigationButtonId(viewId)",
            "UiDualIdContract.buttonIdForView(viewId)",
        ]:
            assert token in source,f"{name}_DUAL_ID_RUNTIME_SYMBOL_MISSING:{token}"

    web=web_inventory()
    assert web["pages"]==PAGES,f"WEB_PAGE_ID_DRIFT:{web['pages']}"
    assert web["nav"]==NAV,f"WEB_NAV_DRIFT:{web['nav']}"
    actual_web={k:tuple(v) for k,v in web["routes"].items()}
    assert actual_web==expected,(
        "WEB_BUTTON_ROUTE_DRIFT:missing="+str(sorted(set(expected)-set(actual_web)))+
        ":extra="+str(sorted(set(actual_web)-set(expected)))
    )

    # Router files do not count until actual production controls carry and dispatch stable View IDs.
    assert "PageRuntimeRouter(" in android_ui,"ANDROID_ROUTER_NOT_INTEGRATED"
    assert 'Toast.makeText(this,"CAD • LIVE WORKSPACE"' not in android_ui,"ANDROID_NAV_CAD_STILL_TOAST_ONLY"
    for token in [
        "val viewId=UiDualIdContract.navigationViewId(navId)",
        "tag=viewId",
        'contentDescription="$viewId • $navId"',
        "productionPageRouter?.navigateView(viewId)",
    ]:
        assert token in android_ui,f"ANDROID_ACTUAL_VIEW_DUAL_ID_MISSING:{token}"

    assert "PageRuntimeRouter(" in desktop_ui,"WINDOWS_ROUTER_NOT_INTEGRATED"
    for token in [
        "val viewId=UiDualIdContract.navigationViewId(navId)",
        "name=viewId",
        'putClientProperty("aig.buttonId",navId)',
        "productionPageRouter?.navigateView(viewId)",
    ]:
        assert token in desktop_ui,f"WINDOWS_ACTUAL_VIEW_DUAL_ID_MISSING:{token}"

    assert 'runtime/page-runtime-router.js' in web_index,"WEB_ROUTER_SCRIPT_NOT_LOADED"
    assert '["AI","#' in web_index or "['AI','#" in web_index,"WEB_AI_PAGE_MISSING"
    assert "new AigPageRuntimeRouter" in web_index,"WEB_ROUTER_NOT_INTEGRATED"
    for token in [
        "b.dataset.buttonId=navButtonId",
        "b.dataset.viewId=navViewId",
        "productionPageRouter.navigateView(navViewId)",
    ]:
        assert token in web_index,f"WEB_ACTUAL_NAV_DUAL_ID_MISSING:{token}"
    for token in ["dispatchView(viewId","navigateView(viewId","viewId:viewIdForButton(buttonId)"]:
        assert token in web_router,f"WEB_ROUTER_DUAL_ID_SYMBOL_MISSING:{token}"
    for token in [
        "btn.dataset.buttonId=buttonId",
        "btn.dataset.viewId=viewId",
        "router.dispatchView(viewId,args())",
        "preflightReady","fixtureCoverageKnown","SIM_PREFLIGHT_READY_REQUIRED","SIM_FIXTURE_COVERAGE_REQUIRED","safeSimReuse",
    ]:
        assert token in web_ai,f"WEB_AI_DUAL_OR_SAFETY_TOKEN_MISSING:{token}"
    verify_web_ai_strict_reuse()

    print(f"PAGE_RUNTIME_CROSS_PLATFORM_PASS|10_PAGES|{len(expected)}_BUTTONS|ANDROID|WINDOWS|WEB|DUAL_VIEW_BUTTON_COMMAND_IDS|ACTUAL_CONTROLS|REAL_ROUTER_INTEGRATION|WEB_AI_STRICT_REUSE")

if __name__=="__main__": main()
