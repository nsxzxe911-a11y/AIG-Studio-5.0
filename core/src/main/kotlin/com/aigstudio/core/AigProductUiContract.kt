package com.aigstudio.core

data class AigProductNavigationEntry(
    val pageId: PageId,
    val viewId: String,
    val buttonId: String,
    val commandId: String,
)

object AigProductUiContract {
    const val SCHEMA = "aig-product-ui-contract-v1"
    const val PROJECT = "AIG"
    const val AXIS_POLICY = "AIG_PRODUCT_AXIS_3_ONLY_SHARED_MULTI_AXIS_CORE_UNCHANGED"

    val PRODUCTION_PAGES: List<PageId> = listOf(
        PageId.HOME,
        PageId.CAD,
        PageId.CAM,
        PageId.SIM,
        PageId.AX3,
        PageId.NC,
        PageId.AI,
    )

    val NAVIGATION: List<AigProductNavigationEntry> = listOf(
        nav(PageId.HOME, "NAV_HOME", "OPEN_HOME"),
        nav(PageId.CAD, "NAV_CAD", "OPEN_CAD"),
        nav(PageId.CAM, "NAV_CAM", "OPEN_CAM"),
        nav(PageId.SIM, "NAV_SIM", "OPEN_SIM"),
        nav(PageId.AX3, "NAV_3AX", "OPEN_3AX"),
        nav(PageId.NC, "NAV_NC", "OPEN_NC"),
        nav(PageId.AI, "NAV_AI", "OPEN_AI"),
    )

    private val navigationByButton: Map<String, AigProductNavigationEntry> =
        NAVIGATION.associateBy { it.buttonId }

    init {
        require(PRODUCTION_PAGES.map { it.id } == listOf("HOME", "CAD", "CAM", "SIM", "3AX", "NC", "AI")) {
            "AIG production page order must stay HOME/CAD/CAM/SIM/3AX/NC/AI."
        }
        require(NAVIGATION.size == 7 && NAVIGATION.map { it.buttonId }.distinct().size == 7) {
            "AIG production navigation must contain seven unique Button IDs."
        }
        require(NAVIGATION.map { it.pageId } == PRODUCTION_PAGES) {
            "AIG navigation order must match production page order."
        }
        require(NAVIGATION.all { it.pageId in PRODUCTION_PAGES }) {
            "AIG product UI may expose only pages declared by its production whitelist."
        }
        NAVIGATION.forEach { entry ->
            require(entry.viewId == UiDualIdContract.navigationViewId(entry.buttonId)) {
                "AIG navigation View ID drift: ${entry.buttonId}."
            }
            val shared = UiButtonManifestContract.byButtonId(entry.buttonId)
            require(shared.surfaceId == entry.pageId.id) {
                "AIG product page does not match shared navigation surface: ${entry.buttonId}."
            }
            require(shared.viewId == entry.viewId) {
                "AIG product View ID does not match shared contract: ${entry.buttonId}."
            }
            require(shared.command.name == entry.commandId) {
                "AIG product Command ID does not match shared contract: ${entry.buttonId}."
            }
        }
    }

    private fun nav(pageId: PageId, buttonId: String, commandId: String) =
        AigProductNavigationEntry(
            pageId = pageId,
            viewId = UiDualIdContract.navigationViewId(buttonId),
            buttonId = buttonId,
            commandId = commandId,
        )

    fun navigationPageMap(): Map<String, PageId> =
        NAVIGATION.associateTo(linkedMapOf()) { it.buttonId to it.pageId }

    fun navigationCommandMap(): Map<String, String> =
        NAVIGATION.associateTo(linkedMapOf()) { it.buttonId to it.commandId }

    fun entry(buttonId: String): AigProductNavigationEntry =
        navigationByButton[buttonId] ?: error("Button ID is not exposed by AIG product UI: $buttonId")

    fun pageForButton(buttonId: String): PageId = entry(buttonId).pageId
}
