package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class CadSceneHitTestRegression {
    @Test fun nodesAreUniqueAdaptiveAndMeetPhoneTouchTargets() {
        val compact = CadSceneLayout.nodes(1080f, 2316f, 3f, toolGroupExpanded = false)
        val wide = CadSceneLayout.nodes(2316f, 1080f, 3f, toolGroupExpanded = false)
        assertEquals(compact.size, compact.map { it.id }.toSet().size)
        assertEquals(compact.map { it.id }.toSet(), wide.map { it.id }.toSet())
        val touchNodes = compact.filterIsInstance<RgbGlassButtonNode>().filter { !it.id.startsWith("NAV.") }
        assertTrue(touchNodes.filter { it.visible }.all { it.bounds.width >= 144f && it.bounds.height >= 144f })
        assertNotEquals(compact.first { it.id == "CAD.VIEWPORT" }.bounds, wide.first { it.id == "CAD.VIEWPORT" }.bounds)
    }

    @Test fun topmostHitWinsAndHiddenPopupNodesDoNotHit() {
        val low = SceneNode("LOW", UiBounds(0f,0f,200f,200f), 1, VisualState.NORMAL, true, true)
        val high = SceneNode("HIGH", UiBounds(0f,0f,200f,200f), 9, VisualState.NORMAL, true, true)
        assertEquals("HIGH", hitTestTopmost(listOf(low, high), 50f, 50f)?.id)
        val collapsed = CadSceneLayout.nodes(1080f,2316f,3f,false)
        assertTrue(collapsed.none { it.id == "CAD.CHAMFER" })
        val expanded = CadSceneLayout.nodes(1080f,2316f,3f,true)
        assertTrue(expanded.first { it.id == "CAD.CHAMFER" }.visible)
        assertTrue(expanded.first { it.id == "CAD.TOOL_GROUP" }.visible)
    }

    @Test fun missingTextureUsesFunctionalFallback() {
        val node = RgbGlassButtonNode("CAD.LINE", UiBounds(0f,0f,160f,160f), 2, "LINE", null, CadCommand.SelectTool(CadTool.LINE))
        assertTrue(node.usesFallback)
        assertTrue(node.enabled)
    }
}
