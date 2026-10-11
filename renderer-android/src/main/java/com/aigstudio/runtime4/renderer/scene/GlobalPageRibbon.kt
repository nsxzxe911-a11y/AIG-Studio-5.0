package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.GlobalPageRibbonContract
import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.UnifiedButtonTokens
import kotlin.math.floor

 data class GlobalPageRibbonResult(
    val top:Float,
    val bottom:Float,
    val buttons:List<RgbGlassButtonNode>,
)

object GlobalPageRibbon {
    val allControlIds:List<String>
        get()=GlobalPageRibbonContract.pageOrder.map(GlobalPageRibbonContract::controlId)

    private fun label(page:PageId):String=when(page){
        PageId.HOME->"首頁"; PageId.CAD->"CAD"; PageId.CAM->"CAM"; PageId.SIM->"SIM"
        PageId.AXIS3->"3AX"; PageId.AXIS4->"4AX"; PageId.AXIS5->"5AX"; PageId.AXIS6->"6AX"
        PageId.NC->"NC"; PageId.AI->"AI"; PageId.MULTIFUNCTION->"多功能"
    }

    fun windowCapacity(widthPx:Float,density:Float):Int {
        val safeDensity=density.coerceAtLeast(0.5f)
        val touch=UnifiedButtonTokens.MIN_TOUCH_DP*safeDensity
        val gap=UnifiedButtonTokens.GAP_DP*safeDensity
        val outer=4f*safeDensity
        return floor(((widthPx-outer*2f)+gap)/(touch+gap)).toInt().coerceIn(1,GlobalPageRibbonContract.pageOrder.size)
    }

    fun startForSelected(widthPx:Float,density:Float,currentPage:PageId):Int {
        val order=GlobalPageRibbonContract.pageOrder
        val fit=windowCapacity(widthPx,density)
        if(fit>=order.size)return 0
        val selectedIndex=order.indexOf(currentPage)
        return if(selectedIndex<0)0 else (selectedIndex-fit/2).coerceIn(0,order.size-fit)
    }

    fun layout(
        widthPx:Float,
        heightPx:Float,
        density:Float,
        currentPage:PageId,
        windowStart:Int?=null,
        topPx:Float=0f,
    ):GlobalPageRibbonResult{
        val safeDensity=density.coerceAtLeast(0.5f)
        val touch=UnifiedButtonTokens.MIN_TOUCH_DP*safeDensity
        val gap=UnifiedButtonTokens.GAP_DP*safeDensity
        val outer=4f*safeDensity
        val order=GlobalPageRibbonContract.pageOrder
        val fit=windowCapacity(widthPx,safeDensity)
        val maxStart=(order.size-fit).coerceAtLeast(0)
        val start=(windowStart ?: startForSelected(widthPx,safeDensity,currentPage)).coerceIn(0,maxStart)
        val visible=order.subList(start,start+fit)
        val content=(widthPx-outer*2f-gap*(fit-1)).coerceAtLeast(touch*fit)
        val buttonWidth=(content/fit).coerceAtLeast(touch)
        val top=topPx+outer
        val bottom=(top+touch).coerceAtMost(heightPx.coerceAtLeast(top+touch))
        val buttons=visible.mapIndexed{index,page->
            val left=outer+index*(buttonWidth+gap)
            val right=left+buttonWidth
            RgbGlassButtonNode(
                id=GlobalPageRibbonContract.controlId(page),
                bounds=UiBounds(left,top,right,bottom),
                z=4100+index,
                label=label(page),
                textureRef=null,
                commandBinding=null,
                visualState=if(page==currentPage) VisualState.SELECTED else VisualState.NORMAL,
                enabled=true,
                visible=true,
                skinRole=RgbSkinRole.WORKSTATION_NAV,
            )
        }
        return GlobalPageRibbonResult(top,bottom,buttons)
    }
}

class GlobalPageRibbonWindowState(initialStart:Int=0){
    var windowStart:Int=initialStart.coerceAtLeast(0); private set
    fun apply(release:PageToolRelease,widthPx:Float,density:Float){
        val maxStart=(GlobalPageRibbonContract.pageOrder.size-GlobalPageRibbon.windowCapacity(widthPx,density)).coerceAtLeast(0)
        windowStart=when(release){
            PageToolRelease.SWIPE_LEFT->maxStart
            PageToolRelease.SWIPE_RIGHT->0
            else->windowStart.coerceIn(0,maxStart)
        }
    }
}
