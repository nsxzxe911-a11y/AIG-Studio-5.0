package com.aigstudio.core

enum class ProductionPage { HOME, CAD, CAM, SIM, AXIS, NC, AI, SETTINGS }
enum class ProductionActionAvailability { CONNECTED, DISABLED }

data class ProductionActionState(
    val availability:ProductionActionAvailability,
    val reasonKey:String?=null
) {
    init {
        require(availability==ProductionActionAvailability.CONNECTED || !reasonKey.isNullOrBlank()) {
            "Disabled product action requires a reason key"
        }
    }
}

data class ProductionActionSpec(
    val id:String,
    val page:ProductionPage,
    val android:ProductionActionState,
    val windows:ProductionActionState
)

/**
 * Canonical product-action availability. CONNECTED means a production callback
 * reaches real shared/runtime behavior; DISABLED means the product must not
 * present the action as usable until that chain exists.
 */
object ProductionActionContract {
    private val connected=ProductionActionState(ProductionActionAvailability.CONNECTED)
    private fun disabled(key:String)=ProductionActionState(ProductionActionAvailability.DISABLED,key)
    private fun both(id:String,page:ProductionPage)=ProductionActionSpec(id,page,connected,connected)

    val actions=listOf(
        both("HOME_NAVIGATION",ProductionPage.HOME),
        both("HOME_RUNTIME_LINKS",ProductionPage.HOME),

        both("CAD_DRAW",ProductionPage.CAD),
        both("CAD_SELECT_EDIT",ProductionPage.CAD),
        both("CAD_CHAMFER",ProductionPage.CAD),
        both("CAD_FILLET",ProductionPage.CAD),
        both("CAD_TRIM_EXTEND",ProductionPage.CAD),
        both("CAD_OFFSET_ARRAY",ProductionPage.CAD),
        both("CAD_SNAP_UNDO_REDO_DIM",ProductionPage.CAD),
        ProductionActionSpec(
            "CAD_LAYER",ProductionPage.CAD,
            disabled("action.disabled.layers"),disabled("action.disabled.layers")
        ),

        both("CAM_AUTO_MANUAL",ProductionPage.CAM),
        both("CAM_SAFE_Z_ENTRY_EXIT",ProductionPage.CAM),
        both("CAM_AVOIDANCE",ProductionPage.CAM),
        both("CAM_COMPENSATION",ProductionPage.CAM),

        both("SIM_CONTROL",ProductionPage.SIM),
        both("SIM_MATERIAL_COLLISION",ProductionPage.SIM),

        both("AXIS_3_4_5_6",ProductionPage.AXIS),
        both("AXIS_ROTARY_STATE",ProductionPage.AXIS),

        both("NC_EDIT_POST",ProductionPage.NC),
        both("NC_SINGLE_BLOCK_DRY_RUN",ProductionPage.NC),
        both("NC_BLOCK_SKIP_ALARM",ProductionPage.NC),

        both("AI_LOCAL_ASSIST",ProductionPage.AI),
        ProductionActionSpec(
            "AI_WORKING_COPY",ProductionPage.AI,
            disabled("action.disabled.aiWorkingCopy"),disabled("action.disabled.aiWorkingCopy")
        ),

        both("SETTINGS_LANGUAGE_RENDERER_FPS",ProductionPage.SETTINGS),
        both("SETTINGS_VISUAL_RUNTIME",ProductionPage.SETTINGS)
    )

    private val byId=actions.associateBy { it.id }
    fun spec(id:String):ProductionActionSpec=byId[id] ?: error("Unknown production action: $id")
}
