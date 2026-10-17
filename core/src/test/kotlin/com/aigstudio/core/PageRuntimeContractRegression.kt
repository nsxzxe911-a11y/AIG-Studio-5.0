package com.aigstudio.core

private class FakePageRuntime(override val pageId: PageId) : PageRuntime {
    private var rev = 7L

    override fun dispatch(command: PageCommand): PageResult {
        if (command.page != pageId || command.subpage.page != pageId) {
            return PageResult.Rejected(pageId, "WRONG_PAGE_COMMAND", rev)
        }
        rev += 1
        return PageResult.Accepted(pageId, command.commandId, rev)
    }

    override fun snapshot() = PageSnapshot(pageId, rev, mapOf("stable" to "true"))
    override fun messages(): List<PageMessage> = emptyList()
    override fun exportPayload(target: RuntimeLinkId): RuntimeBridgePayload? = null
    override fun importPayload(source: RuntimeLinkId, payload: RuntimeBridgePayload): PageResult =
        PageResult.Rejected(pageId, "BRIDGE_NOT_IMPLEMENTED", rev)
}

fun main(){
    check(PageId.entries.map { it.id } == listOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","6AX","NC","AI"))

    val expected = setOf(
        "HOME.MAIN","HOME.PROJECTS","HOME.SETTINGS",
        "CAD.MAIN","CAD.DRAW","CAD.EDIT","CAD.VIEW","CAD.PHOTO","CAD.FILE",
        "CAM.MAIN","CAM.AUTO","CAM.MANUAL","CAM.TOOL","CAM.REGION","CAM.POST_PREVIEW",
        "SIM.MAIN","SIM.MATERIAL","SIM.COLLISION","SIM.PLAYBACK","SIM.RESULT",
        "3AX.MACHINE","3AX.NC_FIRST","4AX.MACHINE","4AX.NC_FIRST","5AX.MACHINE","5AX.NC_FIRST","6AX.MACHINE","6AX.NC_FIRST",
        "NC.EDITOR","NC.PARSER","NC.PREVIEW","NC.VERIFY","NC.OUTPUT",
        "AI.ASSIST","AI.PLAN","AI.AUDIT","AI.RECOVERY"
    )
    check(PageCatalog.subpages.map { it.value }.toSet() == expected)
    check(PageCatalog.requireSubpage("CAD.DRAW").page == PageId.CAD)
    check(runCatching { PageCatalog.requireSubpage("CAM.DRAW") }.isFailure)
    check(PageMessageSeverity.entries.map { it.name } == listOf("INFO","NOTICE","WARNING","ALARM","BLOCKED_ACTION"))
    check(ButtonDangerClass.entries.map { it.name } == listOf("NORMAL","CAUTION","CNC_OUTPUT"))

    val cad = FakePageRuntime(PageId.CAD)
    val before = cad.snapshot()
    val wrong = cad.dispatch(PageCommand(PageId.CAM, PageCatalog.requireSubpage("CAM.MAIN"), "CAM.AUTO.GENERATE"))
    check(wrong is PageResult.Rejected)
    check(cad.snapshot() == before)

    val msg = PageMessage(
        PageId.CAD,
        PageCatalog.requireSubpage("CAD.DRAW"),
        "INVALID_RADIUS",
        "Radius must be positive",
        "CAD.DRAW.CIRCLE",
        11L,
        42L
    )
    check(msg.pageId == PageId.CAD && msg.subpageId?.page == PageId.CAD)

    println("PAGE_RUNTIME_CONTRACT_PASS|10_PAGES|37_SUBPAGES|LOCAL_REJECT_NO_MUTATION|MESSAGES|DANGER_CLASS")
}
