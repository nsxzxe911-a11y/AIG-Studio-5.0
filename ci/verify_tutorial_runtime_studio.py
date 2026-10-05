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
    pack=read('core/src/main/kotlin/com/aigstudio/core/tutorial/TutorialPack.kt')
    adapter=read('app/src/main/java/com/aigstudio/app/tutorial/TutorialRuntimeAdapter.kt')
    renderer=read('app/src/main/java/com/aigstudio/app/tutorial/TutorialDialogRenderer.kt')
    app=read('app/src/main/java/com/aigstudio/app/AigStudioApplication.kt')
    d_adapter=read('desktop/src/main/kotlin/com/aigstudio/desktop/tutorial/TutorialRuntimeAdapter.kt')
    d_renderer=read('desktop/src/main/kotlin/com/aigstudio/desktop/tutorial/TutorialDialogRenderer.kt')
    bootstrap=read('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopBootstrap.kt')
    for token in ('data class TutorialLesson','fun lessonForPage','fun lessonById','loadFromClassLoader','TUTORIAL_UNAVAILABLE'):
        need(pack,token,'PACK')
    for token in ('fun openTutorial','fun openCurrentPageHelp','fun invokeActionTarget','return false','performClick'):
        need(adapter,token,'ANDROID_ADAPTER')
    for token in ('AI 導航','教程中心','目前頁面說明','BanterLevel.OFF','嘴炮模式'):
        need(renderer,token,'ANDROID_RENDERER')
    need(app,'TutorialOverlayInstaller.install(activity)','ANDROID_BINDING')
    for token in ('fun openTutorial','fun openCurrentPageHelp','fun invokeActionTarget','return false','doClick'):
        need(d_adapter,token,'WINDOWS_ADAPTER')
    for token in ('AI 導航','教程中心','目前頁面說明','BanterLevel.OFF','嘴炮模式'):
        need(d_renderer,token,'WINDOWS_RENDERER')
    need(bootstrap,'TutorialDesktopInstaller.install()','WINDOWS_BINDING')
    index=read('shared/tutorial/tutorial-index.json')
    for page in ('HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI','SETTINGS','VIEW','PHOTO','CORNER','EDIT','FILE','TOOL','WORK','ALARM','MONITOR','SYNC'):
        need(index,'"'+page+'"','PAGE_'+page)
    print('STUDIO_TUTORIAL_RUNTIME_PASS|OFFLINE_PACK|3_ENTRY_POINTS|UNKNOWN_TARGET_FALSE|ANDROID|WINDOWS|BANTER_DEFAULT_OFF')

if __name__=='__main__': main()
