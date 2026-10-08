package com.aigstudio.core

import java.io.File

private fun desktopSource(vararg candidates:String):String {
    val file=candidates.map(::File).firstOrNull{it.exists()} ?: error("source missing: ${candidates.joinToString()}")
    return file.readText()
}

fun main() {
    val bridge=desktopSource(
        "desktop/src/main/kotlin/com/aigstudio/desktop/SharedSettingsDesktopBridge.kt",
        "../desktop/src/main/kotlin/com/aigstudio/desktop/SharedSettingsDesktopBridge.kt"
    )
    check("object SharedSettingsDesktopBridge" in bridge)
    check("Preferences.userRoot().node(\"aigstudio/runtime\")" in bridge)
    check("implemented=setOf(RendererBackend.WINDOWS_JAVA2D)" in bridge.replace(" ",""))
    check("RendererBackend.WINDOWS_D3D12" in bridge)
    check("RendererBackend.WINDOWS_D3D11" in bridge)
    check("fun load():SharedSettingsStore" in bridge)
    check("fun apply(requested:SharedSettingsSnapshot)" in bridge)
    check("prefs.flush()" in bridge)

    val desktop=desktopSource(
        "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt",
        "../desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt"
    )
    check("SharedSettingsDesktopBridge.load()" in desktop)
    check("sharedSettings.rendererOptions()" in desktop)
    check("settings.language" in desktop)
    check("settings.renderer" in desktop)
    check("SharedSettingsDesktopBridge.apply(" in desktop)
    check("StudioDesktopRefreshSettings.select" in desktop)
    check("RuntimeLocalizationDesktopInstaller.refresh()" in desktop)
    check("UiPresentationState.text(\"settings.apply\")" in desktop)

    val localization=desktopSource(
        "desktop/src/main/kotlin/com/aigstudio/desktop/RuntimeLocalizationDesktopInstaller.kt",
        "../desktop/src/main/kotlin/com/aigstudio/desktop/RuntimeLocalizationDesktopInstaller.kt"
    )
    check("java.awt.Window.getWindows().forEach" in localization)

    println("AIGCNC_SETTINGS_DESKTOP_WIRING_PASS|LANGUAGE|AUTO_D3D_DISABLED|JAVA2D_DIAGNOSTIC|FPS_RUNTIME")
}
