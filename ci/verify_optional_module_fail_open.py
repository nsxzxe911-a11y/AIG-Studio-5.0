#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def fail(code:str)->None:
    print('OPTIONAL_MODULE_FAIL_OPEN_FAIL|'+code)
    raise SystemExit(1)

def read(rel:str)->str:
    p=ROOT/rel
    if not p.is_file(): fail('MISSING|'+rel)
    return p.read_text(encoding='utf-8')

def main()->None:
    android=read('app/src/main/java/com/aigstudio/app/AigStudioApplication.kt')
    desktop=read('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopBootstrap.kt')
    forbidden=(
        'import com.aigstudio.app.tutorial.TutorialOverlayInstaller',
        'import com.aigstudio.desktop.tutorial.TutorialDesktopInstaller',
    )
    joined=android+'\n'+desktop
    for token in forbidden:
        if token in joined: fail('COMPILE_TIME_IMPORT|'+token)
    required=(
        'Class.forName("com.aigstudio.app.tutorial.TutorialOverlayInstaller")',
        'Class.forName("com.aigstudio.desktop.tutorial.TutorialDesktopInstaller")',
        'OPTIONAL_MODULE_SKIP',
        'runCatching',
        'DesktopAppKt',
    )
    for token in required:
        if token not in joined: fail('MISSING_POLICY|'+token)
    print('OPTIONAL_MODULE_FAIL_OPEN_PASS|TUTORIAL_V1|NO_COMPILE_TIME_BIND|REFLECTION|WARNING_ONLY|NO_ROLLBACK')

if __name__=='__main__': main()
