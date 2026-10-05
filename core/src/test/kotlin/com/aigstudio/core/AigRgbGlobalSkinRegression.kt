package com.aigstudio.core

fun main() {
    val expected = listOf(
        "HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI","SETTINGS",
        "VIEW","PHOTO","CORNER","EDIT","FILE","TOOL","WORK","ALARM","MONITOR","SYNC","LINK"
    )
    check(AigRgbGlobalSkinV1.formalSurfaceIds() == expected)
    check(AigRgbGlobalSkinV1.normalizeSurface("3D").id == "SIM")
    check(AigRgbGlobalSkinV1.normalizeSurface("5X").id == "5AX")
    check(AigRgbGlobalSkinV1.normalizeSurface("6X").id == "6AX")
    check(AigRgbGlobalSkinV1.normalizeSurface("NC_EDIT").id == "NC")
    check(AigRgbGlobalSkinV1.normalizeSurface("unknown").id == "HOME")
    check(AigRgbGlobalSkinV1.BACKGROUND_RGB == 0x020407)
    check(AigRgbGlobalSkinV1.PANEL_RGB == 0x07111B)
    check(AigRgbWidgetRole.entries.map { it.name } == listOf("NAV","TOOL","PRIMARY","STATUS","WARNING","DANGER","INPUT","GROUP"))
    check(AigRgbVisualState.entries.map { it.name } == listOf("NORMAL","PRESSED","SELECTED","DISABLED","WARNING","ALARM"))
    AigRgbVisualState.entries.forEach { check(!AigRgbGlobalSkinV1.versionControlActionAllowed(it)) }
    check(AigRgbGlobalSkinV1.surface("ALARM").dangerStatusPolicy == "STATUS_ONLY_NO_VERSION_ACTION")
    println("AIG_RGB_GLOBAL_SKIN_PASS|22_SURFACES|BLACK_020407|PANEL_07111B|RED_STATUS_ONLY")
}
