package com.aigstudio.core

import java.io.File

private fun source(vararg candidates:String):String {
    val file=candidates.map(::File).firstOrNull{it.exists()} ?: error("source missing: ${candidates.joinToString()}")
    return file.readText()
}

fun main() {
    val bridge=source(
        "app/src/main/java/com/aigstudio/app/SharedSettingsAndroidBridge.kt",
        "../app/src/main/java/com/aigstudio/app/SharedSettingsAndroidBridge.kt"
    )
    check("object SharedSettingsAndroidBridge" in bridge)
    check("SharedSettingsStore" in bridge)
    check("RendererBackend.ANDROID_HWUI" in bridge)
    check("implemented=setOf(RendererBackend.ANDROID_HWUI)" in bridge.replace(" ",""))
    check("RendererBackend.ANDROID_OPENGL_ES" !in bridge.substringAfter("implemented=setOf(").substringBefore(")"))
    check("fun load(activity:Activity)" in bridge)
    check("fun apply(activity:Activity" in bridge)
    check("commit()" in bridge)

    val main=source(
        "app/src/main/java/com/aigstudio/app/MainActivity.kt",
        "../app/src/main/java/com/aigstudio/app/MainActivity.kt"
    )
    check("SharedSettingsAndroidBridge.load(this)" in main)
    check("settings.language" in main)
    check("settings.renderer" in main)
    check("sharedSettings.rendererOptions()" in main)
    check("override fun isEnabled(position:Int):Boolean=rendererOptions[position].selectable" in main)
    check("SharedSettingsAndroidBridge.apply(" in main)
    check(main.indexOf("SharedSettingsAndroidBridge.apply(") < main.indexOf("adaptiveRefreshController?.applyFromPreferences()"))
    check("UiPresentationState.text(\"settings.apply\")" in main)
    check("UiPresentationState.text(\"settings.cancel\")" in main)
    check("RuntimeLocalizationAndroidInstaller.bindWindow(settingsDialog.window)" in main)

    val localization=source(
        "app/src/main/java/com/aigstudio/app/RuntimeLocalizationAndroidInstaller.kt",
        "../app/src/main/java/com/aigstudio/app/RuntimeLocalizationAndroidInstaller.kt"
    )
    check("fun bindWindow(window:Window?)" in localization)
    check("window.decorView" in localization)
    check("bindTree(decor)" in localization)

    println("AIGCNC_SETTINGS_ANDROID_WIRING_PASS|SHARED_STATE_FIRST|LANGUAGE|TRUTHFUL_RENDERER|DIALOG_WINDOW_LOCALIZATION")
}
