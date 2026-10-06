from pathlib import Path

path = Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, code: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PATCH_ABORT|STUDIO|{code}|COUNT={count}')
    text = text.replace(old, new, 1)

# Repair the first-pass bot patch without rewriting the giant MainActivity.
early_slot_mount = '''        runtimeHost.addView(homePageSlot,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
'''
replace_once(early_slot_mount, '', 'REMOVE_EARLY_SLOT_MOUNT')

runtime_host = '''        val runtimeHost=FrameLayout(this).apply {
            setBackgroundColor(StudioProductionTheme.background)
            contentDescription="AIG CNC PRODUCTION RUNTIME HOST"
        }
        root.visibility=View.GONE
'''
runtime_host_fixed = '''        val runtimeHost=FrameLayout(this).apply {
            setBackgroundColor(StudioProductionTheme.background)
            contentDescription="AIG CNC PRODUCTION RUNTIME HOST"
        }
        runtimeHost.addView(homePageSlot,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        root.visibility=View.GONE
'''
replace_once(runtime_host, runtime_host_fixed, 'MOUNT_SLOT_AFTER_RUNTIME_HOST')

replace_once(
    '.show(com.aigstudio.core.ui.RuntimeSurface.HOME,runtimeViewport())',
    '.show(RuntimeSurface.HOME,runtimeViewport())',
    'UNQUALIFY_HOME_SHOW'
)
replace_once(
    'rgbRuntimePageHost.preload(com.aigstudio.core.ui.RuntimeSurface.HOME) { preload ->',
    'rgbRuntimePageHost.preload { preload ->',
    'FIX_PRELOAD_SIGNATURE'
)

# Keep one hide per navigation branch; duplicate insertion was caused by the first transformer.
text = text.replace(
    'homePageSlot.visibility=View.GONE\n                        homeRoot.visibility=View.GONE; homePageSlot.visibility=View.GONE',
    'homeRoot.visibility=View.GONE; homePageSlot.visibility=View.GONE'
)

# RuntimeSurface lives in the ui subpackage, not com.aigstudio.core.*.
import_anchor = 'import com.aigstudio.core.*\n'
if import_anchor not in text:
    raise SystemExit('PATCH_ABORT|STUDIO|IMPORT_ANCHOR')
if 'import com.aigstudio.core.ui.RuntimeSurface\n' not in text:
    text = text.replace(import_anchor, import_anchor + 'import com.aigstudio.core.ui.RuntimeSurface\n', 1)

# Put the black formal host on screen immediately; asset decode remains background/cached.
old_start = '''        val startRgbHomeMount:()->Unit = {
            rgbRuntimePageHost.preload { preload ->
                preload.onSuccess {
                    showRuntimeHome?.invoke()
                    setContentView(runtimeHost)
                }.onFailure { error ->
                    renderRgbHomeMountError(error)
                    setContentView(runtimeHost)
                }
            }
        }
'''
new_start = '''        val startRgbHomeMount:()->Unit = {
            setContentView(runtimeHost)
            rgbRuntimePageHost.preload { preload ->
                preload.onSuccess {
                    showRuntimeHome?.invoke()
                }.onFailure { error ->
                    renderRgbHomeMountError(error)
                }
            }
        }
'''
replace_once(old_start, new_start, 'SHOW_HOST_BEFORE_PRELOAD')

if text.index('val runtimeHost=FrameLayout(this).apply') > text.index('runtimeHost.addView(homePageSlot'):
    raise SystemExit('PATCH_ABORT|STUDIO|SLOT_BEFORE_HOST_DECLARATION')
if 'preload(com.aigstudio.core.ui.RuntimeSurface.HOME)' in text:
    raise SystemExit('PATCH_ABORT|STUDIO|OLD_PRELOAD_SIGNATURE_REMAINS')
if 'show(RuntimeSurface.HOME' not in text:
    raise SystemExit('PATCH_ABORT|STUDIO|HOME_SHOW_MISSING')
if 'runtimeHost.addView(homeRoot' in text:
    raise SystemExit('PATCH_ABORT|STUDIO|LEGACY_DIRECT_HOME_ADD_REMAINS')

path.write_text(text, encoding='utf-8')
print('PATCH_PASS|STUDIO|HOME_HOST_REPAIRED')
