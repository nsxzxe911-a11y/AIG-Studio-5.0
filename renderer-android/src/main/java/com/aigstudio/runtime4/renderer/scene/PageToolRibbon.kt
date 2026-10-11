package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageToolRibbonContract
import com.aigstudio.runtime4.contract.UnifiedVisualState
import kotlin.math.abs

enum class PageToolGestureState { IDLE, TRACKING, SWIPING, CANCELLED }
enum class PageToolRelease { TAP, SWIPE_LEFT, SWIPE_RIGHT, CANCEL }

class PageToolGestureTracker(private val touchSlopPx:Float) {
    private var downX=0f
    private var downY=0f
    private var state=PageToolGestureState.IDLE
    var tapActivationId:String?=null
        private set

    fun onDown(
        x:Float,
        y:Float,
        activationId:String?=null,
        visualState:UnifiedVisualState=UnifiedVisualState.NORMAL,
        enabled:Boolean=true,
    ){
        downX=x; downY=y; state=PageToolGestureState.TRACKING
        tapActivationId=if(enabled && visualState!=UnifiedVisualState.DISABLED && visualState!=UnifiedVisualState.ALARM) activationId else null
    }

    fun onMove(x:Float,y:Float):PageToolGestureState{
        if(state==PageToolGestureState.IDLE || state==PageToolGestureState.CANCELLED)return state
        val dx=x-downX; val dy=y-downY
        if(state==PageToolGestureState.TRACKING && abs(dx)>touchSlopPx && abs(dx)>abs(dy)*1.20f){
            state=PageToolGestureState.SWIPING; tapActivationId=null
        } else if(state==PageToolGestureState.TRACKING && abs(dy)>touchSlopPx*1.5f && abs(dy)>abs(dx)){
            state=PageToolGestureState.CANCELLED; tapActivationId=null
        }
        return state
    }

    fun onUp(x:Float,y:Float):PageToolRelease{
        val dx=x-downX
        val release=when(state){
            PageToolGestureState.TRACKING->PageToolRelease.TAP
            PageToolGestureState.SWIPING->if(dx<0f)PageToolRelease.SWIPE_LEFT else PageToolRelease.SWIPE_RIGHT
            else->PageToolRelease.CANCEL
        }
        state=PageToolGestureState.IDLE
        if(release!=PageToolRelease.TAP)tapActivationId=null
        return release
    }

    fun cancel(){ state=PageToolGestureState.IDLE; tapActivationId=null }
}

class PageToolRibbonState(private val pageCount:Int,initialPage:Int=0) {
    init { require(pageCount>0) { "pageCount must be positive" } }
    var pageIndex:Int=initialPage.coerceIn(0,pageCount-1)
        private set

    fun apply(release:PageToolRelease){
        pageIndex=when(release){
            PageToolRelease.SWIPE_LEFT->(pageIndex+1)%pageCount
            PageToolRelease.SWIPE_RIGHT->(pageIndex-1+pageCount)%pageCount
            else->pageIndex
        }
    }
}

object PageToolRibbonModel {
    fun pages(controlIds:List<String>,groupSize:Int=4):List<List<String>> =
        PageToolRibbonContract.group(controlIds,groupSize)
}

data class PageToolSlot(val controlId:String,val bounds:UiBounds)

object PageToolRibbonLayout {
    fun slots(panel:UiBounds,controlIds:List<String>,gapPx:Float=8f):List<PageToolSlot>{
        if(controlIds.isEmpty())return emptyList()
        require(controlIds.size<=PageToolRibbonContract.MAX_GROUP_SIZE) { "A visible tool group supports at most 6 controls" }
        val gap=gapPx.coerceAtLeast(0f)
        val width=((panel.width-gap*(controlIds.size-1))/controlIds.size).coerceAtLeast(0f)
        return controlIds.mapIndexed{index,id->
            val left=panel.left+index*(width+gap)
            PageToolSlot(id,UiBounds(left,panel.top,left+width,panel.bottom))
        }
    }

    fun controlAt(panel:UiBounds,controlIds:List<String>,x:Float,y:Float,gapPx:Float=8f):String? =
        slots(panel,controlIds,gapPx).firstOrNull{it.bounds.contains(x,y)}?.controlId
}
