package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.renderer.gpu.RenderRoutePolicy
import com.aigstudio.runtime4.contract.SceneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class Axis4SceneLayoutRegression {
    @Test fun axis4HasDedicatedRouteAndNavigation() {
        assertEquals(SceneId.AXIS4, SharedVisualPolicy.destination("NAV.4AX"))
        assertEquals(FourthRenderRoute.AXIS4, RenderRoutePolicy.forScene(SceneId.AXIS4))
        assertEquals(FourthRenderRoute.AXIS5, RenderRoutePolicy.forScene(SceneId.AXIS5))
        assertTrue(HomeSceneLayout.nodes(1080f,1920f,2f).none{it.id=="NAV.4AX"})
        assertNotNull(HomeSceneLayout.nodes(1080f,1920f,2f).firstOrNull{it.id=="NAV.MULTIFUNCTION"})
        assertNotNull(Axis3SceneLayout.nodes(1080f,1920f,2f).firstOrNull{it.id=="NAV.4AX"})
    }

    @Test fun portraitAndLandscapeStayInsideViewportWith48dpControls() {
        val density=2f
        listOf(1080f to 1920f,1920f to 1080f).forEach{(width,height)->
            val nodes=Axis4SceneLayout.nodes(width,height,density)
            assertNotNull(nodes.firstOrNull{it.id=="AXIS4.VIEWPORT"})
            val selected=nodes.filterIsInstance<RgbGlassButtonNode>().first{it.id=="NAV.4AX"}
            assertEquals(VisualState.SELECTED,selected.visualState)
            nodes.forEach{node->
                assertTrue("left ",node.bounds.left>=0f)
                assertTrue("top ",node.bounds.top>=0f)
                assertTrue("right ",node.bounds.right<=width)
                assertTrue("bottom ",node.bounds.bottom<=height)
            }
            nodes.filterIsInstance<RgbGlassButtonNode>().forEach{node->
                assertTrue("width ",node.bounds.width>=48f*density)
                assertTrue("height ",node.bounds.height>=48f*density)
            }
        }
    }
}