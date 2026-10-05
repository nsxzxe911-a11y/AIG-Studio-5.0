#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def fail(code:str)->None:
    print('STUDIO_TUTORIAL_RUNTIME_FAIL|'+code)
    raise SystemExit(1)

def read(rel:str)->str:
    p=ROOT/rel
    if not p.is_file(): fail('MISSING|'+rel)
    return p.read_text(encoding='utf-8')

def need(text:str,token:str,code:str)->None:
    if token not in text: fail(code+'|'+token)

def main()->None:
    policy=read('config/optional-modules.properties')
    need(policy,'TUTORIAL_V1=OPTIONAL_FAIL_OPEN','POLICY')
    need(policy,'MAIN_RUNTIME_BLOCK=OFF','POLICY')
    need(policy,'AUTO_ROLLBACK=OFF','POLICY')

    app=read('app/src/main/java/com/aigstudio/app/AigStudioApplication.kt')
    bootstrap=read('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopBootstrap.kt')
    if 'import com.aigstudio.app.tutorial.TutorialOverlayInstaller' in app:
        fail('ANDROID_HARD_BIND')
    if 'import com.aigstudio.desktop.tutorial.TutorialDesktopInstaller' in bootstrap:
        fail('WINDOWS_HARD_BIND')
    need(app,'Class.forName("com.aigstudio.app.tutorial.TutorialOverlayInstaller")','ANDROID_OPTIONAL_BINDING')
    need(app,'OPTIONAL_MODULE_SKIP','ANDROID_OPTIONAL_BINDING')
    need(bootstrap,'Class.forName("com.aigstudio.desktop.tutorial.TutorialDesktopInstaller")','WINDOWS_OPTIONAL_BINDING')
    need(bootstrap,'OPTIONAL_MODULE_SKIP','WINDOWS_OPTIONAL_BINDING')
    need(bootstrap,'DesktopAppKt','MAIN_RUNTIME_DELEGATE')

    module_paths=[
        'core/src/main/kotlin/com/aigstudio/core/tutorial/TutorialPack.kt',
        'app/src/main/java/com/aigstudio/app/tutorial/TutorialRuntimeAdapter.kt',
        'app/src/main/java/com/aigstudio/app/tutorial/TutorialDialogRenderer.kt',
        'desktop/src/main/kotlin/com/aigstudio/desktop/tutorial/TutorialRuntimeAdapter.kt',
        'desktop/src/main/kotlin/com/aigstudio/desktop/tutorial/TutorialDialogRenderer.kt',
    ]
    missing=[rel for rel in module_paths if not (ROOT/rel).is_file()]
    if missing:
        print('STUDIO_TUTORIAL_RUNTIME_SKIP|OPTIONAL_MODULE_NOT_INSTALLED|MAIN_RUNTIME_CONTINUES|NO_ROLLBACK|MISSING='+','.join(missing))
        return

    pack=read(module_paths[0])
    adapter=read(module_paths[1])
    renderer=read(module_paths[2])
    d_adapter=read(module_paths[3])
    d_renderer=read(module_paths[4])
    for token in ('data class TutorialLesson','fun lessonForPage','fun lessonById','loadFromClassLoader','TUTORIAL_UNAVAILABLE'):
        need(pack,token,'PACK')
    for token in ('fun openTutorial','fun openCurrentPageHelp','fun invokeActionTarget','return false','performClick'):
        need(adapter,token,'ANDROID_ADAPTER')
    for token in ('AI 導航','教程中心','目前頁面說明','BanterLevel.OFF','嘴炮模式'):
        need(renderer,token,'ANDROID_RENDERER')
    for token in ('fun openTutorial','fun openCurrentPageHelp','fun invokeActionTarget','return false','doClick'):
        need(d_adapter,token,'WINDOWS_ADAPTER')
    for token in ('AI 導航','教程中心','目前頁面說明','BanterLevel.OFF','嘴炮模式'):
        need(d_renderer,token,'WINDOWS_RENDERER')
    index=read('shared/tutorial/tutorial-index.json')
    for page in ('HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI','SETTINGS','VIEW','PHOTO','CORNER','EDIT','FILE','TOOL','WORK','ALARM','MONITOR','SYNC'):
        need(index,'"'+page+'"','PAGE_'+page)
    print('STUDIO_TUTORIAL_RUNTIME_PASS|OFFLINE_PACK|3_ENTRY_POINTS|UNKNOWN_TARGET_FALSE|ANDROID|WINDOWS|BANTER_DEFAULT_OFF|OPTIONAL_FAIL_OPEN')

if __name__=='__main__': main()
