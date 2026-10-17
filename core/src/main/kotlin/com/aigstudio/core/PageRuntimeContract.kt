package com.aigstudio.core

enum class PageId(val id: String) {
    HOME("HOME"),
    CAD("CAD"),
    CAM("CAM"),
    SIM("SIM"),
    AX3("3AX"),
    AX4("4AX"),
    AX5("5AX"),
    AX6("6AX"),
    NC("NC"),
    AI("AI");

    companion object {
        fun fromId(id: String): PageId = entries.firstOrNull { it.id == id }
            ?: error("Unknown page ID: $id")
    }
}

data class SubpageId(val page: PageId, val value: String) {
    init {
        require(value.startsWith("${page.id}.")) { "Subpage $value does not belong to ${page.id}" }
    }
}

enum class ButtonDangerClass { NORMAL, CAUTION, CNC_OUTPUT }

data class PageCommand(
    val page: PageId,
    val subpage: SubpageId,
    val commandId: String,
    val arguments: Map<String, String> = emptyMap(),
) {
    init {
        require(subpage.page == page) { "Command page ${page.id} does not own ${subpage.value}" }
        require(commandId.isNotBlank()) { "commandId must not be blank" }
    }
}

data class PageSnapshot(
    val pageId: PageId,
    val revision: Long,
    val state: Map<String, String> = emptyMap(),
)

sealed interface PageResult {
    val pageId: PageId
    val revision: Long

    data class Accepted(
        override val pageId: PageId,
        val commandId: String,
        override val revision: Long,
        val evidence: Map<String, String> = emptyMap(),
    ) : PageResult

    data class Rejected(
        override val pageId: PageId,
        val code: String,
        override val revision: Long,
        val detail: String = "",
    ) : PageResult
}

enum class PageMessageSeverity { INFO, NOTICE, WARNING, ALARM, BLOCKED_ACTION }

data class PageMessage(
    val pageId: PageId,
    val subpageId: SubpageId?,
    val code: String,
    val detail: String,
    val relatedButtonId: String? = null,
    val revision: Long,
    val timestampEpochMs: Long,
    val severity: PageMessageSeverity = PageMessageSeverity.INFO,
) {
    init {
        require(subpageId == null || subpageId.page == pageId) { "Message subpage must belong to page" }
        require(code.isNotBlank()) { "Message code must not be blank" }
    }
}

data class RuntimeBridgePayload(
    val schema: String,
    val revision: Long,
    val digest: String,
    val sourcePage: PageId,
    val targetPage: PageId,
    val body: Map<String, String> = emptyMap(),
)

interface PageRuntime {
    val pageId: PageId
    fun dispatch(command: PageCommand): PageResult
    fun snapshot(): PageSnapshot
    fun messages(): List<PageMessage>
    fun exportPayload(target: RuntimeLinkId): RuntimeBridgePayload?
    fun importPayload(source: RuntimeLinkId, payload: RuntimeBridgePayload): PageResult
}

object PageCatalog {
    val subpages: List<SubpageId> = listOf(
        SubpageId(PageId.HOME, "HOME.MAIN"),
        SubpageId(PageId.HOME, "HOME.PROJECTS"),
        SubpageId(PageId.HOME, "HOME.SETTINGS"),
        SubpageId(PageId.CAD, "CAD.MAIN"),
        SubpageId(PageId.CAD, "CAD.DRAW"),
        SubpageId(PageId.CAD, "CAD.EDIT"),
        SubpageId(PageId.CAD, "CAD.VIEW"),
        SubpageId(PageId.CAD, "CAD.PHOTO"),
        SubpageId(PageId.CAD, "CAD.FILE"),
        SubpageId(PageId.CAM, "CAM.MAIN"),
        SubpageId(PageId.CAM, "CAM.AUTO"),
        SubpageId(PageId.CAM, "CAM.MANUAL"),
        SubpageId(PageId.CAM, "CAM.TOOL"),
        SubpageId(PageId.CAM, "CAM.REGION"),
        SubpageId(PageId.CAM, "CAM.POST_PREVIEW"),
        SubpageId(PageId.SIM, "SIM.MAIN"),
        SubpageId(PageId.SIM, "SIM.MATERIAL"),
        SubpageId(PageId.SIM, "SIM.COLLISION"),
        SubpageId(PageId.SIM, "SIM.PLAYBACK"),
        SubpageId(PageId.SIM, "SIM.RESULT"),
        SubpageId(PageId.AX3, "3AX.MACHINE"),
        SubpageId(PageId.AX3, "3AX.NC_FIRST"),
        SubpageId(PageId.AX4, "4AX.MACHINE"),
        SubpageId(PageId.AX4, "4AX.NC_FIRST"),
        SubpageId(PageId.AX5, "5AX.MACHINE"),
        SubpageId(PageId.AX5, "5AX.NC_FIRST"),
        SubpageId(PageId.AX6, "6AX.MACHINE"),
        SubpageId(PageId.AX6, "6AX.NC_FIRST"),
        SubpageId(PageId.NC, "NC.EDITOR"),
        SubpageId(PageId.NC, "NC.PARSER"),
        SubpageId(PageId.NC, "NC.PREVIEW"),
        SubpageId(PageId.NC, "NC.VERIFY"),
        SubpageId(PageId.NC, "NC.OUTPUT"),
        SubpageId(PageId.AI, "AI.ASSIST"),
        SubpageId(PageId.AI, "AI.PLAN"),
        SubpageId(PageId.AI, "AI.AUDIT"),
        SubpageId(PageId.AI, "AI.RECOVERY"),
    )

    private val byValue = subpages.associateBy { it.value }

    init {
        require(PageId.entries.map { it.id }.distinct().size == PageId.entries.size) { "Duplicate page ID" }
        require(byValue.size == subpages.size) { "Duplicate subpage ID" }
    }

    fun requireSubpage(value: String): SubpageId = byValue[value]
        ?: error("Unknown subpage ID: $value")

    fun subpages(page: PageId): List<SubpageId> = subpages.filter { it.page == page }
}
