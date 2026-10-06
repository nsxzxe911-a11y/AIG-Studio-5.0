from pathlib import Path

path = Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, code: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PATCH_ABORT|STUDIO|{code}|COUNT={count}')
    text = text.replace(old, new, 1)

# Compile repair 1: runtimeHost exists before homePageSlot, so defer adding the slot until after its declaration.
host_with_early_slot = '''        val runtimeHost=FrameLayout(this).apply {
            setBackgroundColor(StudioProductionTheme.background)
            contentDescription="AIG CNC PRODUCTION RUNTIME HOST"
        }
        runtimeHost.addView(homePageSlot,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        root.visibility=View.GONE
'''
host_without_early_slot = '''        val runtimeHost=FrameLayout(this).apply {
            setBackgroundColor(StudioProductionTheme.background)
            contentDescription="AIG CNC PRODUCTION RUNTIME HOST"
        }
        root.visibility=View.GONE
'''
replace_once(host_with_early_slot, host_without_early_slot, 'REMOVE_SLOT_BEFORE_DECLARATION')

slot_anchor = '''        val homePageSlot=FrameLayout(this).apply {
            contentDescription="AIG CNC RGB-FIRST HOME SLOT"
            visibility=View.VISIBLE
        }
        val homeContent=LinearLayout(this).apply {
'''
slot_fixed = '''        val homePageSlot=FrameLayout(this).apply {
            contentDescription="AIG CNC RGB-FIRST HOME SLOT"
            visibility=View.VISIBLE
        }
        runtimeHost.addView(homePageSlot,FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        val homeContent=LinearLayout(this).apply {
'''
replace_once(slot_anchor, slot_fixed, 'MOUNT_SLOT_AFTER_DECLARATION')

# Compile repair 2: first transformer wrote a literal newline inside a Kotlin quoted string.
broken_message = '''                text="AIG RGB HOME 掛載失敗 • "+(error.message ?: error.javaClass.simpleName)+"
正式 Runtime 保持可恢復，不切工程殼"
'''
fixed_message = '''                text="AIG RGB HOME 掛載失敗 • "+(error.message ?: error.javaClass.simpleName)+"\\n正式 Runtime 保持可恢復，不切工程殼"
'''
replace_once(broken_message, fixed_message, 'FIX_KOTLIN_ERROR_MESSAGE_ESCAPE')

if text.index('val runtimeHost=FrameLayout(this).apply') > text.index('val homePageSlot=FrameLayout(this).apply'):
    raise SystemExit('PATCH_ABORT|STUDIO|HOST_MUST_PRECEDE_SLOT_DECLARATION')
if text.index('val homePageSlot=FrameLayout(this).apply') > text.index('runtimeHost.addView(homePageSlot'):
    raise SystemExit('PATCH_ABORT|STUDIO|SLOT_MOUNT_MUST_FOLLOW_DECLARATION')
if 'show(RuntimeSurface.HOME' not in text:
    raise SystemExit('PATCH_ABORT|STUDIO|HOME_HOST_SHOW_MISSING')
if 'rgbRuntimePageHost.preload {' not in text:
    raise SystemExit('PATCH_ABORT|STUDIO|PRELOAD_SIGNATURE_NOT_REPAIRED')
if 'runtimeHost.addView(homeRoot' in text:
    raise SystemExit('PATCH_ABORT|STUDIO|LEGACY_DIRECT_HOME_ADD_REMAINS')

path.write_text(text, encoding='utf-8')
print('PATCH_PASS|STUDIO|HOME_HOST_COMPILE_REPAIR')
