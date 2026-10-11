package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.renderer.gpu.RenderRoutePolicy
import org.junit.Assert.*
import org.junit.Test

class MultifunctionPageRegression {
    @Test fun multifunctionIsCompatibilityOnlyAndCanonicalizesToHome(){
        assertEquals(SceneId.HOME,PageId.MULTIFUNCTION.toSceneId())
        assertEquals(FourthRenderRoute.HOME,RenderRoutePolicy.forScene(SceneId.MULTIFUNCTION))
        assertEquals(SceneId.HOME,SharedVisualPolicy.destination("NAV.MULTIFUNCTION"))
        assertNull(PageSurfaceTexturePlan.path(PageId.MULTIFUNCTION))
    }

    @Test fun visibleFallbackNavigationHasTenDirectPagesAndNoMultifunction(){
        val nodes=ProfessionalTopNavigationLayout.layout(1080f,2316f,3f,"NAV.HOME").buttons
        val ids=nodes.map{it.id}
        assertEquals(listOf("NAV.HOME","NAV.CAD","NAV.CAM","NAV.SIM","NAV.3AX","NAV.4AX","NAV.5AX","NAV.6AX","NAV.NC","NAV.AI"),ids)
        assertFalse("NAV.MULTIFUNCTION" in ids)
    }
}
