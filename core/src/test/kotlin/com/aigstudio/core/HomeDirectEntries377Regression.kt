package com.aigstudio.core

import java.io.File

private fun root377(): File {
    var dir = File(".").canonicalFile
    repeat(8) {
        if (File(dir, "release-version.properties").isFile) return dir
        dir = dir.parentFile ?: return@repeat
    }
    error("AIG CNC repository root not found")
}

fun main() {
    val root = root377()
    val android = File(root, "app/src/main/java/com/aigstudio/app/MainActivity.kt").readText()
    val desktop = File(root, "desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt").readText()
    val machining = File(root, "core/src/main/kotlin/com/aigstudio/core/Machining3D.kt").readText()

    check("homeAction(\"3AX\"" in android) { "Android HOME must expose direct 3AX" }
    check("showDirectThreeAxisHome()" in android) { "Android 3AX HOME must use direct 3AX preview path" }
    check("homeAction(\"NC/G\\u78BC\"" in android) { "Android HOME must expose direct NC/G-code editor" }
    check("showNcEditDialog()" in android) { "Android NC/G-code HOME must use existing direct editor" }
    check("ThreeAxisPreviewScene.create(" in android) { "Android no-CAM 3AX must build a neutral real machine scene" }
    check("Machining3DView(this,preview,\"3AX\")" in android.replace(" ", "")) { "Android direct 3AX must render Machining3DView in 3AX mode" }

    check("homeLaunch(\"3AX\"" in desktop) { "Windows HOME must expose 3AX" }
    check("showDirectThreeAxisPreview(" in desktop) { "Windows HOME 3AX must not depend on CAM prerequisite" }
    check("homeLaunch(\"NC/G\\u78BC\"" in desktop) { "Windows HOME must expose NC/G-code label" }
    check("showNcEditor(" in desktop) { "Windows NC/G-code HOME must call direct editor" }

    check("object ThreeAxisPreviewScene" in machining) { "Shared neutral 3AX preview scene contract missing" }
    println("AIGCNC_377_HOME_DIRECT_3AX_NC_PASS|ANDROID_WINDOWS|NO_CAM_PREREQ_FOR_3AX_PREVIEW|DIRECT_GCODE_EDITOR")
}
