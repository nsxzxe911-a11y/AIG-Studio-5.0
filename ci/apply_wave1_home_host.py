from pathlib import Path

path = Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
text = path.read_text(encoding='utf-8')

def replace_once(old: str, new: str, code: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PATCH_ABORT|{code}|COUNT={count}')
    text = text.replace(old, new, 1)

old_home_root = '''        val homeRoot=FrameLayout(this).apply {
            contentDescription="AIG CNC FORMAL RGB HOME • aigii_rgb_neon_v2"
            val base=GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(
                    StudioProductionTheme.background,
                    StudioProductionTheme.panel,
                    Color.rgb(2,7,14)
                )
            )
            val wallpaper=ProductionRgbAssets.drawable(this@MainActivity,"HOME")?.apply { alpha=0 }
            background=if(wallpaper!=null)
                android.graphics.drawable.LayerDrawable(arrayOf(base,wallpaper))
            else base
        }
'''
new_home_root = '''        val homeRoot=FrameLayout(this).apply {
            contentDescription="AIG CNC FORMAL RGB HOME • FUNCTION LAYER"
            setBackgroundColor(Color.TRANSPARENT)
        }
        val homePageSlot=FrameLayout(this).apply {
            contentDescription="AIG CNC RGB-FIRST HOME SLOT"
            visibility=View.VISIBLE
        }
        runtimeHost.addView(homePageSlot,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
'''
replace_once(old_home_root, new_home_root, 'HOME_ROOT_TRANSPARENT')

old_mount = '''        refreshHomePreview()
        showRuntimeHome={
            refreshHomePreview()
            root.visibility=View.GONE
            homeRoot.visibility=View.VISIBLE
        }
        runtimeHost.addView(homeRoot,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))

        StudioStartupBootGuard.mark(this,StudioStartupStage.UI_RENDERER)
        // Formal RGB HOME is explicitly the first visible Runtime surface.
        root.visibility=View.GONE
        homeRoot.visibility=View.VISIBLE
        homeRoot.contentDescription="AIG CNC PRODUCTION HOME RUNTIME • FIRST FRAME"
        setContentView(runtimeHost)
'''
new_mount = '''        refreshHomePreview()
        fun runtimeViewport():com.aigstudio.core.ui.RuntimeViewport {
            val metrics=resources.displayMetrics
            val density=metrics.density.coerceAtLeast(0.5f)
            return com.aigstudio.core.ui.RuntimeResponsivePolicy.classify(
                (metrics.widthPixels/density).toInt().coerceAtLeast(1),
                (metrics.heightPixels/density).toInt().coerceAtLeast(1),
                density
            )
        }
        val homeActions=com.aigstudio.app.ui.bridge.HomeCallbackBridge(
            navigate={ surface ->
                when(surface) {
                    com.aigstudio.core.ui.RuntimeSurface.HOME -> showRuntimeHome?.invoke()
                    com.aigstudio.core.ui.RuntimeSurface.CAD -> {
                        homePageSlot.visibility=View.GONE
                        homeRoot.visibility=View.GONE
                        root.visibility=View.VISIBLE
                    }
                    com.aigstudio.core.ui.RuntimeSurface.CAM -> {
                        homePageSlot.visibility=View.GONE
                        homeRoot.visibility=View.GONE
                        showCamWorkstation()
                    }
                    else -> Unit
                }
            },
            settings={ showEnvironmentSettings() }
        )
        val homeRegistry=com.aigstudio.app.ui.AndroidRuntimeUiRegistry(
            listOf(com.aigstudio.app.ui.pages.home.HomePageModule { homeRoot })
        )
        val rgbRuntimePageHost=com.aigstudio.app.ui.host.RuntimePageHost(
            this,
            homeRegistry,
            homeActions
        )
        fun renderRgbHomeMountError(error:Throwable) {
            homePageSlot.removeAllViews()
            homePageSlot.addView(TextView(this).apply {
                setBackgroundColor(StudioProductionTheme.background)
                setTextColor(StudioProductionTheme.warning)
                gravity=Gravity.CENTER
                textSize=12f
                text="AIG RGB HOME 掛載失敗 • "+(error.message ?: error.javaClass.simpleName)+"\n正式 Runtime 保持可恢復，不切工程殼"
            },FrameLayout.LayoutParams(-1,-1))
        }
        fun mountFormalRgbHome():Result<View> = rgbRuntimePageHost
            .show(com.aigstudio.core.ui.RuntimeSurface.HOME,runtimeViewport())
            .onSuccess { page ->
                homePageSlot.removeAllViews()
                homePageSlot.addView(page,FrameLayout.LayoutParams(-1,-1))
            }
        showRuntimeHome={
            refreshHomePreview()
            root.visibility=View.GONE
            homeRoot.visibility=View.VISIBLE
            homePageSlot.visibility=View.VISIBLE
            mountFormalRgbHome().onFailure(::renderRgbHomeMountError)
        }
        val startRgbHomeMount:()->Unit = {
            rgbRuntimePageHost.preload(com.aigstudio.core.ui.RuntimeSurface.HOME) { preload ->
                preload.onSuccess {
                    showRuntimeHome?.invoke()
                    setContentView(runtimeHost)
                }.onFailure { error ->
                    renderRgbHomeMountError(error)
                    setContentView(runtimeHost)
                }
            }
        }

        StudioStartupBootGuard.mark(this,StudioStartupStage.UI_RENDERER)
        // Formal RGB HOME is mounted by RuntimePageHost after its approved RGB asset is decoded.
        root.visibility=View.GONE
        homeRoot.visibility=View.VISIBLE
        homePageSlot.visibility=View.VISIBLE
        homeRoot.contentDescription="AIG CNC PRODUCTION HOME RUNTIME • FIRST FRAME"
'''
replace_once(old_mount, new_mount, 'HOME_HOST_WIRING')

listener = '        homeRoot.viewTreeObserver.addOnDrawListener(firstHomeDrawListener)\n'
replace_once(listener, listener + '        startRgbHomeMount()\n', 'START_HOME_AFTER_DRAW_LISTENER_REGISTERED')

# Any legacy navigation that hides the HOME function layer must hide the full RGB-first slot too.
legacy_hide = 'homeRoot.visibility=View.GONE'
count = text.count(legacy_hide)
if count < 1:
    raise SystemExit('PATCH_ABORT|HOME_HIDE_PATHS|COUNT=0')
text = text.replace(legacy_hide, 'homeRoot.visibility=View.GONE; homePageSlot.visibility=View.GONE')

if 'runtimeHost.addView(homeRoot' in text:
    raise SystemExit('PATCH_ABORT|LEGACY_DIRECT_HOME_ADD_REMAINS')
if 'wallpaper=ProductionRgbAssets.drawable(this@MainActivity,"HOME")?.apply { alpha=0 }' in text:
    raise SystemExit('PATCH_ABORT|INVISIBLE_HOME_WALLPAPER_REMAINS')
if 'show(com.aigstudio.core.ui.RuntimeSurface.HOME' not in text:
    raise SystemExit('PATCH_ABORT|HOME_HOST_SHOW_MISSING')

path.write_text(text, encoding='utf-8')
print('PATCH_PASS|STUDIO|HOME_RGB_FIRST_HOST')
