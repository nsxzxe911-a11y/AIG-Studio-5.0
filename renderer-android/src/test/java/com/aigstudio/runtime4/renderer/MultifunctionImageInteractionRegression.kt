package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import com.aigstudio.runtime4.contract.SceneId
import com.aigstudio.runtime4.contract.ui.AigUiAction
import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.renderer.gpu.RenderRoutePolicy
import org.junit.Assert.*
import org.junit.Test

class MultifunctionImageInteractionRegression {
    @Test fun multifunctionIsCompatibilityOnlyAndNeverVisible(){
        assertNull(PageSurfaceTexturePlan.path(PageId.MULTIFUNCTION))
        assertEquals(SceneId.HOME,PageId.MULTIFUNCTION.toSceneId())
        assertEquals(SceneId.HOME,SharedVisualPolicy.destination("NAV.MULTIFUNCTION"))
        assertEquals(FourthRenderRoute.HOME,RenderRoutePolicy.forScene(SceneId.MULTIFUNCTION))
        val home=HomeProfessionalDescriptor.descriptor().components
        assertTrue(home.none{it.controlId=="HOME.QUICK.MULTI"})
        assertTrue(home.none{(it.action as? AigUiAction.Navigate)?.page==PageId.MULTIFUNCTION})
    }

    @Test fun visiblePrimaryNavigationContainsExactlyTenPagesWithoutMultifunction(){
        val nodes=PrimaryPageNavigationLayout.nodes(2160f,3840f,PageId.HOME)
        val pages=nodes.mapNotNull{(it.aigActionBinding as? AigUiAction.Navigate)?.page}
        assertEquals(listOf(PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI),pages)
        assertFalse(PageId.MULTIFUNCTION in pages)
    }
}
