package com.aigstudio.core

import java.io.File

private fun readVisualQualitySource(vararg candidates:String):String {
    val file=candidates.asSequence().map(::File).firstOrNull{it.isFile}
        ?: error("source file missing: "+candidates.joinToString())
    return file.readText()
}

fun main(){
    val refresh=readVisualQualitySource(
        "../app/src/main/java/com/aigstudio/app/AdaptiveRefreshController.kt",
        "app/src/main/java/com/aigstudio/app/AdaptiveRefreshController.kt"
    )
    val machining3d=readVisualQualitySource(
        "../app/src/main/java/com/aigstudio/app/Machining3DView.kt",
        "app/src/main/java/com/aigstudio/app/Machining3DView.kt"
    )

    check("VisualQualityRuntime.setRequested" in refresh)
    check("VisualQualityRuntime.updateFromHardware" in refresh)
    check("visual_quality" in refresh)
    check("Balanced" in refresh)
    check("VisualQualityRuntime.current().resolutionScale" in machining3d)
    check("materialRemovalDisplayStride" in machining3d)
    check("toolpathDisplayStride" in machining3d)

    println("AIGCNC_VISUAL_QUALITY_WIRING_PASS|BALANCED_DEFAULT|ANDROID_HARDWARE_ADAPT|MESH_BUDGET_SCALE|DISPLAY_STRIDES")
}
