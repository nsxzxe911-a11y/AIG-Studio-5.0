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
    val buttonId: String,
    val surfaceId: String,
    val assetId: String,
    val command: SharedUiCommand,
    val verifiedCallback: String,
    val bounds: UiButtonBounds? = null,
)

object UiButtonManifestContract {
    const val SCHEMA="aig-ui-button-manifest-v1"
    const val AUTHORITY_POLICY="AUTHORITY_RGB_TO_BUTTON_ID_TO_MANIFEST_TO_SHARED_COMMAND_TO_RUNTIME_CORE"
    const val UNVERIFIED_BOUNDS_ALLOWED=true

    val PRODUCTION_NAVIGATION = listOf(
        UiButtonManifestEntry(
            buttonId = "NAV_HOME",
            surfaceId = "HOME",
            assetId = "rgb_wallpaper",
            command = SharedUiCommand.OPEN_HOME,
            verifiedCallback = "showRuntimeHome?.invoke()",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_CAD",
            surfaceId = "CAD",
            assetId = "cad",
            command = SharedUiCommand.OPEN_CAD,
            verifiedCallback = "selectTool(Tool.SELECT)",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_CAM",
            surfaceId = "CAM",
            assetId = "cam",
            command = SharedUiCommand.OPEN_CAM,
            verifiedCallback = "showCamWorkstation()",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_SIM",
            surfaceId = "SIM",
            assetId = "sim",
            command = SharedUiCommand.OPEN_SIM,
            verifiedCallback = """showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))""",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_3AX",
            surfaceId = "3AX",
            assetId = "3ax",
            command = SharedUiCommand.OPEN_3AX,
            verifiedCallback = """showUnifiedMachiningWorkspace("3AX")""",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_4AX",
            surfaceId = "4AX",
            assetId = "4ax",
            command = SharedUiCommand.OPEN_4AX,
            verifiedCallback = """showUnifiedMachiningWorkspace("4AX")""",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_5AX",
            surfaceId = "5AX",
            assetId = "5ax",
            command = SharedUiCommand.OPEN_5AX,
            verifiedCallback = """showUnifiedMachiningWorkspace("5AX")""",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_6AX",
            surfaceId = "6AX",
            assetId = "6ax",
            command = SharedUiCommand.OPEN_6AX,
            verifiedCallback = "showSixAxisRuntimeStage()",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_NC",
            surfaceId = "NC",
            assetId = "nc",
            command = SharedUiCommand.OPEN_NC,
            verifiedCallback = """showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC"))""",
        ),
        UiButtonManifestEntry(
            buttonId = "NAV_AI",
            surfaceId = "AI",
            assetId = "ai",
            command = SharedUiCommand.OPEN_AI,
            verifiedCallback = "showAiSystemSuiteDialog()",
        ),
    )

    init {
        require(PRODUCTION_NAVIGATION.map { it.buttonId }.distinct().size == PRODUCTION_NAVIGATION.size) {
            "Duplicate Button ID in production navigation manifest."
        }
        require(PRODUCTION_NAVIGATION.all { it.bounds == null }) {
            "Authority RGB bounds must stay null until pixel verification."
        }
        require(PRODUCTION_NAVIGATION.all { it.verifiedCallback.isNotBlank() }) {
            "Every Button ID must reference a verified live callback."
        }
    }

    fun byButtonId(buttonId: String): UiButtonManifestEntry =
        PRODUCTION_NAVIGATION.firstOrNull { it.buttonId == buttonId }
            ?: error("Unknown Button ID: $buttonId")
}
