#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(rel):
    p=ROOT/rel
    if not p.is_file():
        raise AssertionError(f"missing required formal binding file: {rel}")
    return p.read_text(encoding="utf-8")

def need(text,needle,label):
    if needle not in text:
        raise AssertionError(f"{label}: missing {needle!r}")

def forbid(text,needle,label):
    if needle in text:
        raise AssertionError(f"{label}: forbidden {needle!r}")

shared=read("core/src/main/kotlin/com/aigstudio/core/FormalPageCoreExecution.kt")
need(shared,"object StudioFormalPageContract","SHARED_FORMAL_CONTRACT")
need(shared,"object StudioPageCoreCatalog","SHARED_CORE_CATALOG")
need(shared,"MACHINE_OUTPUT_ENABLED=false","SHARED_MACHINE_OUTPUT_GUARD")

android_app=read("app/src/main/java/com/aigstudio/app/AigStudioApplication.kt")
android=read("app/src/main/java/com/aigstudio/app/FormalPageCoreBindingInstaller.kt")
need(android_app,"FormalPageCoreBindingInstaller.install(activity)","ANDROID_INSTALL")
need(android,"StudioFormalPageContract.actions(page)","ANDROID_SHARED_ACTIONS")
need(android,"executeFormalCoreAction","ANDROID_CORE_EXECUTOR")
need(android,"StudioAxisPageRuntime(","ANDROID_AXIS_RUNTIME")
need(android,"MACHINE OUTPUT=OFF","ANDROID_MACHINE_OUTPUT_GUARD")
for cmd in (
    '"PROJECT.SAVE"','"CAD.LINE"','"CAM.AUTO"','"SIM.MATERIAL_REMOVAL"',
    '"AXIS3.JOG_X"','"AXIS4.JOG_A"','"AXIS5.JOG_B"','"AXIS6.JOG_C"',
    '"NC.VALIDATE"','"AI.CHECK"','"SETTINGS.PRECISION"'
): need(android,cmd,"ANDROID_PAGE_ROUTE")
forbid(android,"ENGINEERING_SHELL","ANDROID_NO_ENGINEERING_SHELL")

bootstrap=read("desktop/src/main/kotlin/com/aigstudio/desktop/DesktopBootstrap.kt")
windows=read("desktop/src/main/kotlin/com/aigstudio/desktop/FormalPageCoreDesktopBinding.kt")
need(bootstrap,"FormalPageCoreDesktopBinding.installGlobal()","WINDOWS_INSTALL")
need(windows,"StudioFormalPageContract.actions(page)","WINDOWS_SHARED_ACTIONS")
need(windows,"executeFormalCoreAction","WINDOWS_CORE_EXECUTOR")
need(windows,"StudioAxisPageRuntime(","WINDOWS_AXIS_RUNTIME")
need(windows,"MACHINE OUTPUT=OFF","WINDOWS_MACHINE_OUTPUT_GUARD")
for cmd in (
    '"PROJECT.SAVE"','"CAD.LINE"','"CAM.AUTO"','"SIM.MATERIAL_REMOVAL"',
    '"AXIS3.JOG_X"','"AXIS4.JOG_A"','"AXIS5.JOG_B"','"AXIS6.JOG_C"',
    '"NC.VALIDATE"','"AI.CHECK"','"SETTINGS.PRECISION"'
): need(windows,cmd,"WINDOWS_PAGE_ROUTE")
forbid(windows,"ENGINEERING_SHELL","WINDOWS_NO_ENGINEERING_SHELL")

print("STUDIO_FORMAL_PAGE_PLATFORM_BINDING_GATE_PASS|ANDROID|WINDOWS|SHARED_COMMANDS|REAL_CORE|XYZABC|MACHINE_OUTPUT_OFF|NO_ENGINEERING_SHELL")
