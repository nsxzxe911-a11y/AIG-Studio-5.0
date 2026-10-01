package com.aigstudio.core

enum class AiLayoutDeviceClass { PHONE_PORTRAIT, PHONE_LANDSCAPE, DESKTOP }
enum class AiLayoutHandedness { RIGHT, LEFT }

data class AiLayoutPlan(
    val deviceClass: AiLayoutDeviceClass,
    val modeOrder: List<String>,
    val cadToolOrder: List<String>,
    val primaryRegions: List<String>,
    val destructiveRegion: String,
    val minTouchDp: Int,
    val handedness: AiLayoutHandedness,
    val themePackHotSwap: Boolean,
    val restartRequired: Boolean
)

object AiLayoutComposerContract {
    const val PROFILE="AIG_AI_LAYOUT_COMPOSER_V1"
    val MODE_ORDER=listOf("CAD","CAM","SIM","3AX","4AX","5AX","NC","AI")
    val CAD_TOOL_ORDER=listOf("LINE","RECT","CIRCLE","ARC","HOLE")
    val DESTRUCTIVE_ACTIONS=setOf("DELETE","CLEAR","RESET","DISCONNECT","NC_DESTRUCTIVE")
    val IMMUTABLE_RUNTIME_DOMAINS=setOf(
        "CAD_GEOMETRY","CAM_TOOLPATH","SIM_MATERIAL_REMOVAL","NC_GCODE",
        "COORDINATE_TRUTH","CNC_SAFETY","PROJECT_DATA"
    )

    fun classify(widthDp:Int,heightDp:Int):AiLayoutDeviceClass = when {
        widthDp>=900 -> AiLayoutDeviceClass.DESKTOP
        widthDp>heightDp -> AiLayoutDeviceClass.PHONE_LANDSCAPE
        else -> AiLayoutDeviceClass.PHONE_PORTRAIT
    }

    fun compose(
        widthDp:Int,
        heightDp:Int,
        leftHanded:Boolean=false
    ):AiLayoutPlan {
        val device=classify(widthDp,heightDp)
        val regions=when(device){
            AiLayoutDeviceClass.PHONE_PORTRAIT -> listOf(
                "TOP_MODE_RIBBON","PRIMARY_WORKSPACE","QUICK_TOOL_RAIL",
                "STATUS_CARDS","PRIMARY_ACTION_BAR","UTILITY_DOCK"
            )
            AiLayoutDeviceClass.PHONE_LANDSCAPE -> listOf(
                "TOP_MODE_RIBBON","LEFT_TOOL_RAIL","PRIMARY_WORKSPACE",
                "RIGHT_STATUS_RAIL","PRIMARY_ACTION_BAR"
            )
            AiLayoutDeviceClass.DESKTOP -> listOf(
                "TOP_MODE_RIBBON","LEFT_NAV_RAIL","PRIMARY_WORKSPACE",
                "RIGHT_MACHINE_RAIL","BOTTOM_STATUS_OPERATION"
            )
        }
        return AiLayoutPlan(
            deviceClass=device,
            modeOrder=MODE_ORDER,
            cadToolOrder=CAD_TOOL_ORDER,
            primaryRegions=regions,
            destructiveRegion="ISOLATED_CRITICAL_ACTIONS",
            minTouchDp=if(device==AiLayoutDeviceClass.DESKTOP)44 else 48,
            handedness=if(leftHanded)AiLayoutHandedness.LEFT else AiLayoutHandedness.RIGHT,
            themePackHotSwap=true,
            restartRequired=false
        )
    }

    fun valid(plan:AiLayoutPlan):Boolean =
        plan.modeOrder==MODE_ORDER &&
        plan.cadToolOrder==CAD_TOOL_ORDER &&
        plan.destructiveRegion=="ISOLATED_CRITICAL_ACTIONS" &&
        plan.minTouchDp>=44 &&
        plan.themePackHotSwap &&
        !plan.restartRequired
}

object ThemePackHotSwapContract {
    const val PROFILE="AIG_THEME_PACK_HOT_SWAP_V1"
    const val RUNTIME_RESTART_REQUIRED=false
    const val NETWORK_REQUIRED=false
    const val FALLBACK="LAST_VERIFIED_THEME_PACK"
    const val ENGINEERING_SHELL_FALLBACK=false
    const val AI_LAYOUT_ALLOWED=true
    const val FUNCTION_REBIND_ALLOWED=false
    const val CNC_CORE_MUTATION_ALLOWED=false

    val allowedChanges=setOf(
        "RGB_PALETTE","GLASS","BACKGROUND","ICONS","SPACING","PANEL_PLACEMENT",
        "RESPONSIVE_REFLOW","TYPOGRAPHY_SCALE","ANIMATION","VISUAL_ASSETS"
    )

    fun valid():Boolean =
        !RUNTIME_RESTART_REQUIRED &&
        !NETWORK_REQUIRED &&
        FALLBACK=="LAST_VERIFIED_THEME_PACK" &&
        !ENGINEERING_SHELL_FALLBACK &&
        AI_LAYOUT_ALLOWED &&
        !FUNCTION_REBIND_ALLOWED &&
        !CNC_CORE_MUTATION_ALLOWED
}
