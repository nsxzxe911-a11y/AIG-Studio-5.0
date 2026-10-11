package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.*
import org.junit.Test

class GlobalPageRibbonRegression {
    @Test fun fixedOrderUsesExactTenStableNavIds(){
        assertEquals(
            listOf("NAV.HOME","NAV.CAD","NAV.CAM","NAV.SIM","NAV.3AX","NAV.4AX","NAV.5AX","NAV.6AX","NAV.NC","NAV.AI"),
            GlobalPageRibbon.allControlIds
        )
    }

    @Test fun narrowViewportKeepsSafeTargetsAndSelectedPageVisible(){
        val result=GlobalPageRibbon.layout(widthPx=360f,heightPx=800f,density=1f,currentPage=PageId.AXIS6)
        assertTrue(result.buttons.isNotEmpty())
        assertTrue(result.buttons.size<10)
        assertTrue(result.buttons.all{it.bounds.width>=56f && it.bounds.height>=56f})
        val selected=result.buttons.single{it.visualState==VisualState.SELECTED}
        assertEquals("NAV.6AX",selected.id)
    }

    @Test fun windowMovesToKeepFirstAndLastPagesVisible(){
        val home=GlobalPageRibbon.layout(320f,800f,1f,PageId.HOME).buttons.map{it.id}
        val ai=GlobalPageRibbon.layout(320f,800f,1f,PageId.AI).buttons.map{it.id}
        assertTrue("NAV.HOME" in home)
        assertTrue("NAV.AI" in ai)
        assertEquals("NAV.HOME",home.first())
        assertEquals("NAV.AI",ai.last())
    }

    @Test fun largeViewportStillUsesSameOrderAndSelectedSemantics(){
        val result=GlobalPageRibbon.layout(1400f,900f,1f,PageId.CAM)
        assertEquals(GlobalPageRibbon.allControlIds,result.buttons.map{it.id})
        assertEquals("NAV.CAM",result.buttons.single{it.visualState==VisualState.SELECTED}.id)
    }
    @Test fun densePhoneCanSwipeGlobalWindowWithoutShrinkingTargets(){
        assertEquals(8,GlobalPageRibbon.windowCapacity(2160f,4f))
        val state=GlobalPageRibbonWindowState()
        assertEquals(0,state.windowStart)
        state.apply(PageToolRelease.SWIPE_LEFT,2160f,4f)
        assertEquals(2,state.windowStart)
        val back=GlobalPageRibbon.layout(2160f,3840f,4f,PageId.HOME,state.windowStart)
        assertEquals("NAV.CAM",back.buttons.first().id)
        assertEquals("NAV.AI",back.buttons.last().id)
        assertTrue(back.buttons.all{it.bounds.width>=56f*4f})
        state.apply(PageToolRelease.SWIPE_RIGHT,2160f,4f)
        assertEquals(0,state.windowStart)
    }

    @Test fun navigationRecentersWindowSoSelectedPageIsVisible(){
        assertEquals(2,GlobalPageRibbon.startForSelected(2160f,4f,PageId.NC))
        val result=GlobalPageRibbon.layout(2160f,3840f,4f,PageId.NC,GlobalPageRibbon.startForSelected(2160f,4f,PageId.NC))
        assertEquals("NAV.NC",result.buttons.single{it.visualState==VisualState.SELECTED}.id)
    }

}
