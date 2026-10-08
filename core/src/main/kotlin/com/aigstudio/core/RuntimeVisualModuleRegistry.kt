package com.aigstudio.core

data class RuntimeVisualModule(
    val surface:String,
    val visualAsset:String,
    val layoutId:String,
    val actionGroup:String,
    val skinId:String="AIG_RGB_GLASS",
    val sceneProfile:String?=null
)

/**
 * Visual, layout, actions and 3D scene are separate modules. Replacing a skin
 * or reference image must not change machining callbacks or CNC truth.
 */
object RuntimeVisualModuleRegistry {
    val modules=listOf(
        RuntimeVisualModule("HOME", MorningBaselineVisualContract.desktopHome, "HOME_ADAPTIVE", "HOME_ACTIONS"),
        RuntimeVisualModule("CAD", MorningBaselineVisualContract.cadCam, "CAD_ADAPTIVE", "CAD_ACTIONS"),
        RuntimeVisualModule("CAM", MorningBaselineVisualContract.cadCam, "CAM_ADAPTIVE", "CAM_ACTIONS"),
        RuntimeVisualModule("SIM", MorningBaselineVisualContract.desktopRuntime, "SIM_ADAPTIVE", "SIM_ACTIONS", sceneProfile="SIM_SCENE"),
        RuntimeVisualModule("3AX", MorningBaselineVisualContract.desktopRuntime, "AXIS_ADAPTIVE", "AXIS_3_ACTIONS", sceneProfile="3AX_SCENE"),
        RuntimeVisualModule("4AX", "AIG_4AX_Baseline.png", "AXIS_ADAPTIVE", "AXIS_4_ACTIONS", sceneProfile="4AX_SCENE"),
        RuntimeVisualModule("5AX", MorningBaselineVisualContract.desktopRuntime, "AXIS_ADAPTIVE", "AXIS_5_ACTIONS", sceneProfile="5AX_SCENE"),
        RuntimeVisualModule("6AX", MorningBaselineVisualContract.sixAxis, "AXIS_ADAPTIVE", "AXIS_6_ACTIONS", sceneProfile="6AX_SCENE"),
        RuntimeVisualModule("NC", MorningBaselineVisualContract.desktopRuntime, "NC_ADAPTIVE", "NC_ACTIONS"),
        RuntimeVisualModule("AI", "AI_Console_Baseline.png", "AI_ADAPTIVE", "AI_ACTIONS")
    )

    fun require(surface:String):RuntimeVisualModule {
        val normalized=RuntimeSurfaceVisualContract.normalize(surface)
        return modules.first { it.surface==normalized }
    }
}
