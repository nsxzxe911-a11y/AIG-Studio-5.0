package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.CadCommand
import com.aigstudio.runtime4.contract.CadTool
import org.junit.Assert.*
import org.junit.Test

class CadSceneGraphRegression {
    @Test fun arcControlsAreRealGpuNodesWithCommands() {
        val nodes = CadSceneLayout.nodes(2316f, 1080f, 3f, toolGroupExpanded = true)
        val arc = nodes.single { it.id == "CAD.ARC" } as RgbGlassButtonNode
        val dir = nodes.single { it.id == "CAD.ARC_DIR" } as RgbGlassButtonNode
        assertTrue(arc.visible)
        assertTrue(dir.visible)
        assertEquals(CadCommand.SelectTool(CadTool.ARC), arc.commandBinding)
        assertEquals(CadCommand.ToggleArcDirection, dir.commandBinding)
        assertTrue(arc.enabled)
        assertTrue(dir.enabled)
    }
}
