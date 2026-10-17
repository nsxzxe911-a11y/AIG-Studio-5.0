package com.aigstudio.core

enum class SharedUiCommand {
    OPEN_HOME,
    OPEN_CAD,
    OPEN_CAM,
    OPEN_SIM,
    OPEN_3AX,
    OPEN_4AX,
    OPEN_5AX,
    OPEN_6AX,
    OPEN_NC,
    OPEN_AI,
}

data class UiButtonBounds(
    val x: Int,
    val y: Int,
    val width: Int,
    val height: Int,
)

data class UiButtonManifestEntry(
    val viewId: String,
    val buttonId: String,
    val surfaceId: String,
    val assetId: String,
    val command: SharedUiCommand,
    val verifiedCallback: String,
    val bounds: UiButtonBounds? = null,
)

object UiButtonManifestContract {
    const val SCHEMA="aig-ui-button-manifest-v2-dual-id"
    const val AUTHORITY_POLICY="AUTHORITY_RGB_TO_VIEW_ID_TO_BUTTON_ID_TO_SHARED_COMMAND_TO_RUNTIME_CORE"
    const val UNVERIFIED_BOUNDS_ALLOWED=true

    private fun nav(
        page:String,
        assetId:String,
        command:SharedUiCommand,
    )=UiButtonManifestEntry(
        viewId="VIEW.NAV.$page",
        buttonId="NAV_$page",
        surfaceId=page,
        assetId=assetId,
        command=command,
        verifiedCallback="PageRuntimeRouter.navigate(NAV_$page)",
    )

    val PRODUCTION_NAVIGATION = listOf(
        nav("HOME","rgb_wallpaper",SharedUiCommand.OPEN_HOME),
        nav("CAD","cad",SharedUiCommand.OPEN_CAD),
        nav("CAM","cam",SharedUiCommand.OPEN_CAM),
        nav("SIM","sim",SharedUiCommand.OPEN_SIM),
        nav("3AX","3ax",SharedUiCommand.OPEN_3AX),
        nav("4AX","4ax",SharedUiCommand.OPEN_4AX),
        nav("5AX","5ax",SharedUiCommand.OPEN_5AX),
        nav("6AX","6ax",SharedUiCommand.OPEN_6AX),
        nav("NC","nc",SharedUiCommand.OPEN_NC),
        nav("AI","ai",SharedUiCommand.OPEN_AI),
    )

    init {
        require(PRODUCTION_NAVIGATION.map { it.buttonId }.distinct().size == PRODUCTION_NAVIGATION.size) {
            "Duplicate Button ID in production navigation manifest."
        }
        require(PRODUCTION_NAVIGATION.map { it.viewId }.distinct().size == PRODUCTION_NAVIGATION.size) {
            "Duplicate View ID in production navigation manifest."
        }
        require(PRODUCTION_NAVIGATION.all { it.viewId == UiDualIdContract.navigationViewId(it.buttonId) }) {
            "Production navigation View ID must map one-to-one to Button ID."
        }
        require(PRODUCTION_NAVIGATION.all { it.bounds == null }) {
            "Authority RGB bounds must stay null until pixel verification."
        }
        require(PRODUCTION_NAVIGATION.all { it.verifiedCallback.startsWith("PageRuntimeRouter.navigate(") }) {
            "Every navigation ID must route through PageRuntimeRouter."
        }
        require(PRODUCTION_NAVIGATION.none { "toast" in it.verifiedCallback.lowercase() }) {
            "Toast-only production navigation callbacks are forbidden."
        }
    }

    fun byButtonId(buttonId: String): UiButtonManifestEntry =
        PRODUCTION_NAVIGATION.firstOrNull { it.buttonId == buttonId }
            ?: error("Unknown Button ID: $buttonId")

    fun byViewId(viewId: String): UiButtonManifestEntry =
        PRODUCTION_NAVIGATION.firstOrNull { it.viewId == viewId }
            ?: error("Unknown View ID: $viewId")
}
