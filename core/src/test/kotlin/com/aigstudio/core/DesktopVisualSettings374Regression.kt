package com.aigstudio.core

import java.io.File

private fun root374():File {
    val direct=File(".").canonicalFile
    if(File(direct,"core").isDirectory) return direct
    val parent=direct.parentFile
    if(parent!=null && File(parent,"core").isDirectory) return parent
    error("AIG CNC root not found")
}

fun main(){
    val low=DesktopVisualSettingsRuntime.apply(
        SharedSettingsSnapshot(renderQuality=RenderQuality.ECO,powerMode=PowerMode.ECO,rgbBrightness=35,rgbBreathingEnabled=false,hudEnabled=true)
    )
    check(low.visualBudget.preset==VisualQualityPreset.LOW)
    check(low.visualBudget.trueMaterialRemoval)
    check(low.visualBudget.simulationPrecisionMm==0.001)
    check(low.fpsCap==30)
    check(low.rgbBrightness==35 && !low.rgbBreathingEnabled && low.hudEnabled)
    val ultra=DesktopVisualSettingsRuntime.apply(SharedSettingsSnapshot(renderQuality=RenderQuality.ULTRA,powerMode=PowerMode.PERFORMANCE))
    check(ultra.visualBudget.preset==VisualQualityPreset.ULTRA && ultra.fpsCap==120)
    val src=File(root374(),"desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt").readText()
    val bridge=File(root374(),"desktop/src/main/kotlin/com/aigstudio/desktop/SharedSettingsDesktopBridge.kt").readText()
    check("DesktopVisualSettingsRuntime.apply(next)" in bridge)
    check("DesktopVisualSettingsRuntime.fpsCap()" in src)
    check("DesktopVisualSettingsRuntime.rgbBreathingEnabled()" in src)
    check("DesktopVisualSettingsRuntime.rgbChannel(" in src)
    check("DesktopVisualSettingsRuntime.hudEnabled()" in src)
    check("DesktopVisualSettingsRuntime.geometryBudget(" in src)
    println("AIGCNC_374_DESKTOP_VISUAL_RUNTIME_PASS|QUALITY|POWER|RGB|HUD|PRECISION_ISOLATED")
}
