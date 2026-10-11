package com.aigstudio.runtime4.renderer

enum class WorkstationSkinProfile { GRAPHITE, AIG_RGB_ACCENT, HIGH_CONTRAST }

object AigWorkstationSkinTokens {
    val defaultProfile=WorkstationSkinProfile.GRAPHITE

    fun background(profile:WorkstationSkinProfile=defaultProfile):FloatArray=when(profile){
        WorkstationSkinProfile.GRAPHITE->floatArrayOf(0.008f,0.015f,0.024f,1f)
        WorkstationSkinProfile.AIG_RGB_ACCENT->floatArrayOf(0.006f,0.018f,0.030f,1f)
        WorkstationSkinProfile.HIGH_CONTRAST->floatArrayOf(0.0f,0.0f,0.0f,1f)
    }
    fun panelFill(profile:WorkstationSkinProfile=defaultProfile):FloatArray=when(profile){
        WorkstationSkinProfile.GRAPHITE->floatArrayOf(0.025f,0.045f,0.065f,0.96f)
        WorkstationSkinProfile.AIG_RGB_ACCENT->floatArrayOf(0.020f,0.055f,0.085f,0.96f)
        WorkstationSkinProfile.HIGH_CONTRAST->floatArrayOf(0.055f,0.055f,0.055f,1f)
    }
    fun controlFill(state:VisualState,profile:WorkstationSkinProfile=defaultProfile):FloatArray=when(state){
        VisualState.NORMAL->if(profile==WorkstationSkinProfile.HIGH_CONTRAST)floatArrayOf(0.10f,0.10f,0.10f,1f) else floatArrayOf(0.035f,0.070f,0.095f,0.94f)
        VisualState.PRESSED->floatArrayOf(0.055f,0.22f,0.30f,0.98f)
        VisualState.SELECTED->floatArrayOf(0.035f,0.28f,0.36f,0.98f)
        VisualState.DISABLED->floatArrayOf(0.025f,0.035f,0.045f,0.60f)
        VisualState.ALARM->floatArrayOf(0.30f,0.030f,0.055f,0.98f)
    }
    fun accent(state:VisualState):FloatArray=when(state){
        VisualState.SELECTED,VisualState.PRESSED->floatArrayOf(0.10f,0.86f,1f,1f)
        VisualState.ALARM->floatArrayOf(1f,0.18f,0.28f,1f)
        VisualState.DISABLED->floatArrayOf(0.25f,0.31f,0.36f,0.35f)
        VisualState.NORMAL->floatArrayOf(0.20f,0.36f,0.46f,0.78f)
    }
}
