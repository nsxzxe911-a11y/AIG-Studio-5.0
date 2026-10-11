package com.aigstudio.runtime4.renderer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class Axis3SceneLayoutRegression {
    @Test fun portraitAndLandscapeStayInsideViewportAndKeep48dpControls() {
        val density = 3f
        listOf(1080f to 2316f, 2316f to 1080f).forEach { (width, height) ->
            val nodes = Axis3SceneLayout.nodes(width, height, density)
            assertNotNull(nodes.firstOrNull { it.id == "AXIS3.VIEWPORT" })
            val selected = nodes.filterIsInstance<RgbGlassButtonNode>().first { it.id == "NAV.3AX" }
            assertEquals(VisualState.SELECTED, selected.visualState)
            nodes.forEach { node ->
                assertTrue("left ", node.bounds.left >= 0f)
                assertTrue("top ", node.bounds.top >= 0f)
                assertTrue("right ", node.bounds.right <= width)
                assertTrue("bottom ", node.bounds.bottom <= height)
            }
            nodes.filterIsInstance<RgbGlassButtonNode>().forEach { node ->
                assertTrue("width ", node.bounds.width >= 48f * density)
                assertTrue("height ", node.bounds.height >= 48f * density)
            }
        }
    }

    @Test fun homeRoutesAxisPagesDirectlyWithoutMultifunction() {
        val nodes = HomeSceneLayout.nodes(1080f, 2316f, 3f)
        assertNotNull(nodes.firstOrNull { it.id == "NAV.3AX" })
        assertTrue(nodes.none { it.id == "NAV.MULTIFUNCTION" })
    }
}