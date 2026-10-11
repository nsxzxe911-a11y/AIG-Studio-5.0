package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.UnifiedVisualState
import org.junit.Assert.*
import org.junit.Test

class PageToolRibbonRegression {
    @Test fun groupsUseApprovedFourToSixControls(){
        val ids=(1..9).map{"CAD.T$it"}
        assertEquals(listOf(4,4,1),PageToolRibbonModel.pages(ids,4).map{it.size})
        assertEquals(listOf(6,3),PageToolRibbonModel.pages(ids,6).map{it.size})
    }

    @Test fun horizontalSwipeCancelsPendingTapAndChangesOnlyPage(){
        val tracker=PageToolGestureTracker(12f)
        tracker.onDown(200f,100f,"CAD.LINE")
        assertEquals(PageToolGestureState.SWIPING,tracker.onMove(120f,102f))
        val release=tracker.onUp(90f,102f)
        assertEquals(PageToolRelease.SWIPE_LEFT,release)
        assertNull(tracker.tapActivationId)
        val state=PageToolRibbonState(5,0)
        state.apply(release)
        assertEquals(1,state.pageIndex)
    }

    @Test fun disabledAndAlarmControlsNeverExposeActivationId(){
        val disabled=PageToolGestureTracker(10f)
        disabled.onDown(10f,10f,"NC.DELETE",UnifiedVisualState.DISABLED,false)
        assertEquals(PageToolRelease.TAP,disabled.onUp(10f,10f))
        assertNull(disabled.tapActivationId)
        val alarm=PageToolGestureTracker(10f)
        alarm.onDown(10f,10f,"NC.START",UnifiedVisualState.ALARM,true)
        assertEquals(PageToolRelease.TAP,alarm.onUp(10f,10f))
        assertNull(alarm.tapActivationId)
    }

    @Test fun deterministicLargeSlotHitsTwentyTimesWithoutMiss(){
        val panel=UiBounds(0f,0f,920f,160f)
        val ids=listOf("CAD.LINE","CAD.RECT","CAD.CIRCLE","CAD.ARC")
        val slots=PageToolRibbonLayout.slots(panel,ids,8f)
        assertEquals(4,slots.size)
        assertTrue(slots.all{it.bounds.width>=200f})
        repeat(20){
            val first=slots.first().bounds
            val x=(first.left+first.right)/2f; val y=(first.top+first.bottom)/2f
            assertEquals("CAD.LINE",PageToolRibbonLayout.controlAt(panel,ids,x,y,8f))
        }
    }
}
