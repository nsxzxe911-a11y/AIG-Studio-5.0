from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise AssertionError(f'{label}: expected 1 match, got {count}')
    return text.replace(old,new,1)


def patch_android():
    path=Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
    text=read(path)
    if 'val viewId=UiDualIdContract.navigationViewId(navId)' not in text:
        text=replace_once(
            text,
            '            val normalized=ProductionUiSwitchContract.normalize(id)\n            val button=RgbGlowButton(this).apply {',
            '            val normalized=ProductionUiSwitchContract.normalize(id)\n            val navId="NAV_"+normalized\n            val viewId=UiDualIdContract.navigationViewId(navId)\n            val button=RgbGlowButton(this).apply {',
            'ANDROID_NAV_DUAL_ID_DECL',
        )
        text=replace_once(
            text,
            '                text=normalized\n                contentDescription="UI $normalized"',
            '                text=normalized\n                tag=viewId\n                contentDescription="$viewId • $navId"',
            'ANDROID_NAV_VIEW_TAG',
        )
        text=replace_once(
            text,
            '                    val navId="NAV_"+normalized\n                    if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigate(navId) ?: action() else action()',
            '                    if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigateView(viewId) ?: action() else action()',
            'ANDROID_NAV_DISPATCH_VIEW',
        )
    write(path,text)


def patch_desktop():
    path=Path('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt')
    text=read(path)
    if 'val viewId=UiDualIdContract.navigationViewId(navId)' not in text:
        text=replace_once(
            text,
            '        val normalized=ProductionUiSwitchContract.normalize(id)\n        return GlassActionButton(normalized,color).apply {',
            '        val normalized=ProductionUiSwitchContract.normalize(id)\n        val navId="NAV_"+normalized\n        val viewId=UiDualIdContract.navigationViewId(navId)\n        return GlassActionButton(normalized,color).apply {',
            'DESKTOP_NAV_DUAL_ID_DECL',
        )
        text=replace_once(
            text,
            '            toolTipText="正式 UI 切換 • "+normalized\n            productionUiButtons[normalized]=this',
            '            name=viewId\n            putClientProperty("aig.buttonId",navId)\n            toolTipText="正式 UI 切換 • $viewId • $navId"\n            productionUiButtons[normalized]=this',
            'DESKTOP_NAV_VIEW_NAME',
        )
        text=replace_once(
            text,
            '                val navId="NAV_"+normalized\n                if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigate(navId) ?: action() else action()',
            '                if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigateView(viewId) ?: action() else action()',
            'DESKTOP_NAV_DISPATCH_VIEW',
        )
    write(path,text)


def main():
    patch_android()
    patch_desktop()
    print('DUAL_UI_RUNTIME_BINDING_PATCH_PASS|ANDROID_NAV_VIEW_ID|WINDOWS_NAV_VIEW_ID|NAVIGATE_VIEW')

if __name__=='__main__': main()
