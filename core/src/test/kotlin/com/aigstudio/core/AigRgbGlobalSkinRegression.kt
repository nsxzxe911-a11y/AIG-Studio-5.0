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
    check(AigRgbGlobalSkinV1.FORMAL_MODE_ORDER == listOf(
        "HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"
    ))
    check(AiLayoutComposerContract.MODE_ORDER == AigRgbGlobalSkinV1.FORMAL_MODE_ORDER)
    for((width,height) in listOf(360 to 780, 780 to 360, 1440 to 900)){
        val plan=AiLayoutComposerContract.compose(width,height)
        check(AiLayoutComposerContract.valid(plan))
        check(plan.modeOrder.containsAll(listOf("HOME","6AX")))
        check(plan.minTouchDp>=44)
    }
    check(AigRgbGlobalSkinV1.FORMAL_THEME_FAMILY=="AIG_RGB_GLASS_020407_07111B")
    check(AigRgbGlobalSkinV1.CONTROL_ID_SKIN_INDEPENDENT)
    check(AigRgbGlobalSkinV1.NO_ENGINEERING_SHELL_ON_MISSING_ASSET)
    check(AigRgbGlobalSkinV1.authorityAssetKey("HOME")=="rgb_wallpaper")
    for(surfaceId in AigRgbGlobalSkinV1.FORMAL_MODE_ORDER){
        check(AigRgbGlobalSkinV1.checkedNavigationSurface(surfaceId).surfaceId.id==surfaceId)
        check(AigRgbGlobalSkinV1.authorityAssetKey(surfaceId).isNotBlank())
    }
    check(runCatching{AigRgbGlobalSkinV1.checkedNavigationSurface("UNKNOWN")}.isFailure)
    check(AigRgbGlobalSkinV1.ENGINEERING_SHELL_FALLBACK==false)
    check(AigRgbGlobalSkinV1.MOBILE_DESKTOP_ASSET_SPLIT)
    check(AigRgbGlobalSkinV1.stateColor(AigRgbVisualState.WARNING)==0xFFB326)
    check(AigRgbGlobalSkinV1.stateColor(AigRgbVisualState.ALARM)==0xFF465F)
    check(AigRgbGlobalSkinV1.stateColor(AigRgbVisualState.DISABLED)==0x54606A)
    println("AIG_RGB_TEN_PAGE_RESPONSIVE_CONTRACT_PASS|HOME_TO_AI|6AX|ANDROID_DESKTOP|NO_ENGINEERING_FALLBACK|APPROVED_ASSET_KEYS_ONLY")
    println("AIG_RGB_GLOBAL_SKIN_PASS|22_SURFACES|BLACK_020407|PANEL_07111B|RED_STATUS_ONLY")
}
