package com.aigstudio.runtime4.contract

enum class UnifiedControlKind { GLOBAL_NAV, PAGE_TOOL, DANGER, STATUS }
enum class UnifiedVisualState { NORMAL, PRESSED, SELECTED, DISABLED, ALARM }

object UnifiedButtonTokens {
    const val MIN_TOUCH_DP = 56f
    const val PREFERRED_TOUCH_DP = 64f
    const val GAP_DP = 8f
    const val CORNER_RADIUS_DP = 12f
    const val PRESSED_SCALE = 0.95f
    const val PRESSED_INSET_DP = 2f
}

data class UnifiedControlSpec(
    val controlId:String,
    val labelKey:String,
    val iconRole:String?=null,
    val kind:UnifiedControlKind,
    val visualState:UnifiedVisualState=UnifiedVisualState.NORMAL,
    val minTouchDp:Float=UnifiedButtonTokens.MIN_TOUCH_DP,
    val order:Int=0,
    val group:String="",
    val page:PageId?=null,
    val enabled:Boolean=true,
    val disabledReason:String?=null,
)

object GlobalPageRibbonContract {
    val pageOrder:List<PageId> = listOf(
        PageId.HOME, PageId.CAD, PageId.CAM, PageId.SIM,
        PageId.AXIS3, PageId.AXIS4, PageId.AXIS5, PageId.AXIS6,
        PageId.NC, PageId.AI,
    )

    fun controlId(page:PageId):String = when(page){
        PageId.HOME -> "NAV.HOME"
        PageId.CAD -> "NAV.CAD"
        PageId.CAM -> "NAV.CAM"
        PageId.SIM -> "NAV.SIM"
        PageId.AXIS3 -> "NAV.3AX"
        PageId.AXIS4 -> "NAV.4AX"
        PageId.AXIS5 -> "NAV.5AX"
        PageId.AXIS6 -> "NAV.6AX"
        PageId.NC -> "NAV.NC"
        PageId.AI -> "NAV.AI"
        PageId.MULTIFUNCTION -> error("MULTIFUNCTION is not part of the global page ribbon")
    }

    fun specs(currentPage:PageId):List<UnifiedControlSpec> = pageOrder.mapIndexed { index,page ->
        UnifiedControlSpec(
            controlId=controlId(page),
            labelKey="nav.${page.name.lowercase()}",
            iconRole="NAV_${page.name}",
            kind=UnifiedControlKind.GLOBAL_NAV,
            visualState=if(page==currentPage) UnifiedVisualState.SELECTED else UnifiedVisualState.NORMAL,
            order=index,
            group="GLOBAL_PAGE",
            page=page,
        )
    }
}

object PageToolRibbonContract {
    const val MIN_GROUP_SIZE = 4
    const val MAX_GROUP_SIZE = 6

    fun group(controlIds:List<String>,groupSize:Int=4):List<List<String>> {
        require(groupSize in MIN_GROUP_SIZE..MAX_GROUP_SIZE) { "groupSize must be 4..6" }
        return controlIds.chunked(groupSize)
    }
}
