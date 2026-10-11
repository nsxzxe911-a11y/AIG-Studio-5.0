package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.ui.AigUiAction
import org.junit.Assert.*
import org.junit.Test

class UnifiedPrimaryPageSkinRegression {
    private val primary=listOf(PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI)

    @Test fun everyPrimaryPageSharesIdenticalScreenSpaceNavigationGeometry(){
        val baseline=PrimaryPageNavigationLayout.nodes(2160f,3840f,PageId.HOME)
        assertEquals(10,baseline.size)
        val pages=baseline.mapNotNull{(it.aigActionBinding as? AigUiAction.Navigate)?.page}
        assertEquals(primary,pages)
        primary.forEach{active->
            val nodes=PrimaryPageNavigationLayout.nodes(2160f,3840f,active)
            assertEquals(baseline.map{it.bounds},nodes.map{it.bounds})
            assertEquals(1,nodes.count{it.visualState==VisualState.SELECTED})
            assertEquals(active,(nodes.single{it.visualState==VisualState.SELECTED}.aigActionBinding as AigUiAction.Navigate).page)
        }
        assertTrue(baseline.first().bounds.left>=0f)
        assertTrue(baseline.last().bounds.right<=2160f)
        assertTrue((baseline.maxOf{it.bounds.width}-baseline.minOf{it.bounds.width})<20f)
    }

    @Test fun primaryPageSkinsStayMountedRegardlessOfDifferentSourceCanvas(){
        primary.forEach{assertNotNull(PageSurfaceTexturePlan.path(it))}
        assertEquals(941f to 1672f,PageSurfaceTexturePlan.imageSize(PageId.HOME))
        assertEquals(856f to 1836f,PageSurfaceTexturePlan.imageSize(PageId.CAD))
        assertEquals(941f to 1672f,PageSurfaceTexturePlan.imageSize(PageId.SIM))
    }
}
