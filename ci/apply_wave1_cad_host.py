from pathlib import Path

path = Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, code: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PATCH_ABORT|STUDIO|{code}|COUNT={count}')
    text = text.replace(old, new, 1)

replace_once(
'''        var showRuntimeHome:(()->Unit)?=null
''',
'''        var showRuntimeHome:(()->Unit)?=null
        var showRuntimeCad:(()->Unit)?=null
''',
'ADD_CAD_NAV_SLOT'
)

replace_once(
'''        fun enterCadRuntime() {
            homeRoot.visibility=View.GONE; homePageSlot.visibility=View.GONE
            root.visibility=View.VISIBLE
            selectProductionUi("CAD")
            refreshVisibleMode("CAD")
        }
''',
'''        fun enterCadRuntime() {
            showRuntimeCad?.invoke()
        }
''',
'ROUTE_ENTER_CAD_TO_HOST'
)

replace_once(
'''                    com.aigstudio.core.ui.RuntimeSurface.CAD -> {
                        homeRoot.visibility=View.GONE; homePageSlot.visibility=View.GONE
                        root.visibility=View.VISIBLE
                    }
''',
'''                    com.aigstudio.core.ui.RuntimeSurface.CAD -> showRuntimeCad?.invoke()
''',
'ROUTE_HOME_CAD_TO_HOST'
)

replace_once(
'''        val homeRegistry=com.aigstudio.app.ui.AndroidRuntimeUiRegistry(
            listOf(com.aigstudio.app.ui.pages.home.HomePageModule { homeRoot })
        )
        val rgbRuntimePageHost=com.aigstudio.app.ui.host.RuntimePageHost(
            this,
            homeRegistry,
            homeActions
        )
''',
'''        val cadActions=com.aigstudio.app.ui.bridge.CadCallbackBridge(
            tool={ actionId ->
                runCatching { Tool.valueOf(actionId.trim().uppercase(Locale.US)) }
                    .getOrNull()?.let(cad::setTool)
            },
            edit={ actionId ->
                runCatching { Tool.valueOf(actionId.trim().uppercase(Locale.US)) }
                    .getOrNull()?.let(cad::setTool)
            },
            command={ actionId ->
                when(actionId.trim().uppercase(Locale.US)) {
                    "UNDO" -> cad.undo()
                    "REDO" -> cad.redo()
                    "SELECT" -> cad.setTool(Tool.SELECT)
                    "PAN" -> cad.setTool(Tool.PAN)
                    "FIT" -> cad.fitView()
                    "SNAP_TOGGLE" -> cad.toggleSnap()
                    "GRID_TOGGLE" -> cad.toggleGrid()
                    "GEOMETRY_TOGGLE" -> cad.toggleGeometry()
                    "SAVE" -> saveCadCheckpoint()
                    "RECOVER" -> restoreCadCheckpointIfAvailable()
                }
            }
        )
        val runtimeActions=com.aigstudio.core.ui.RuntimeActionSink { action ->
            when(action.kind) {
                com.aigstudio.core.ui.RuntimeActionKind.NAVIGATE,
                com.aigstudio.core.ui.RuntimeActionKind.SETTINGS -> homeActions.dispatch(action)
                else -> cadActions.dispatch(action)
            }
        }
        val homeRegistry=com.aigstudio.app.ui.AndroidRuntimeUiRegistry(
            listOf(
                com.aigstudio.app.ui.pages.home.HomePageModule { homeRoot },
                com.aigstudio.app.ui.pages.cad.CadPageModule(
                    contentFactory={ cad },
                    callbackBridge=cadActions
                )
            )
        )
        val rgbRuntimePageHost=com.aigstudio.app.ui.host.RuntimePageHost(
            this,
            homeRegistry,
            runtimeActions
        )
''',
'REGISTER_CAD_MODULE_AND_BRIDGE'
)

replace_once(
'''        fun mountFormalRgbHome():Result<View> = rgbRuntimePageHost
            .show(RuntimeSurface.HOME,runtimeViewport())
            .onSuccess { page ->
                homePageSlot.removeAllViews()
                homePageSlot.addView(page,FrameLayout.LayoutParams(-1,-1))
            }
        showRuntimeHome={
''',
'''        fun mountFormalRgbHome():Result<View> = rgbRuntimePageHost
            .show(RuntimeSurface.HOME,runtimeViewport())
            .onSuccess { page ->
                homePageSlot.removeAllViews()
                homePageSlot.addView(page,FrameLayout.LayoutParams(-1,-1))
            }
        fun mountFormalRgbCad():Result<View> = rgbRuntimePageHost
            .show(RuntimeSurface.CAD,runtimeViewport())
            .onSuccess { page ->
                homePageSlot.removeAllViews()
                homePageSlot.addView(page,FrameLayout.LayoutParams(-1,-1))
            }
        showRuntimeCad={
            homeRoot.visibility=View.GONE
            root.visibility=View.GONE
            homePageSlot.visibility=View.VISIBLE
            rgbRuntimePageHost.preload(RuntimeSurface.CAD) { preload ->
                preload.onSuccess {
                    mountFormalRgbCad().onFailure(::renderRgbHomeMountError)
                }.onFailure(::renderRgbHomeMountError)
            }
        }
        showRuntimeHome={
''',
'ADD_FORMAL_CAD_MOUNT'
)

checks = {
    'CAD_HOST_SHOW_MISSING': 'show(RuntimeSurface.CAD',
    'CAD_MODULE_REGISTRATION_MISSING': 'CadPageModule(',
    'CAD_BRIDGE_MISSING': 'CadCallbackBridge(',
    'CAD_PRELOAD_MISSING': 'preload(RuntimeSurface.CAD)',
}
for code, token in checks.items():
    if token not in text:
        raise SystemExit(f'PATCH_ABORT|STUDIO|{code}')

legacy_enter = '''fun enterCadRuntime() {
            homeRoot.visibility=View.GONE; homePageSlot.visibility=View.GONE
            root.visibility=View.VISIBLE'''
if legacy_enter in text:
    raise SystemExit('PATCH_ABORT|STUDIO|LEGACY_DIRECT_CAD_ENTRY_REMAINS')

path.write_text(text, encoding='utf-8')
print('PATCH_PASS|STUDIO|CAD_HOST_ONLY')
