package com.aigstudio.core

enum class AiRgbRuntimeSurface(val assetKey:String) {
    HOME_MOBILE("home_mobile"),
    HOME_DESKTOP("home_desktop")
}

object AiRgbMissingAssetContract {
    const val SCHEMA = "AIG_AI_RGB_ASSET_V1"
    const val PIPELINE_ENABLED = true
    const val AUTO_REPLACE_EXISTING = false
    const val PRESERVE_HISTORICAL_PACKS = true
    const val RUNTIME_LOAD_REQUIRES_SHA = true
    const val DIAGNOSTIC_ONLY_ON_FAILURE = true
    const val FALLBACK_PACK = "184"
    const val ANDROID_SUPPLEMENTAL_ROOT = "aig-generated-rgb/ai-supplemental/362"
    const val DESKTOP_SUPPLEMENTAL_ROOT = "/aig-generated-rgb/ai-supplemental/362"

    fun fileName(surface:AiRgbRuntimeSurface):String = when(surface) {
        AiRgbRuntimeSurface.HOME_MOBILE -> "home_mobile.jpg"
        AiRgbRuntimeSurface.HOME_DESKTOP -> "home_desktop.jpg"
    }
}
