package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
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

    @Test fun layerPopupUsesGpuNodesAndRealLayerCommands() {
        class FakeRuntime : CadRuntimePort {
            var current = CadState.initial()
            var last: CadCommand? = null
            override fun snapshot() = current
            override fun dispatch(command: CadCommand): CadDispatchResult {
                last = command
                if (command is CadCommand.SetActiveLayer) current = current.copy(activeLayer = command.layer)
                return CadDispatchResult(true, current)
            }
        }
        val runtime = FakeRuntime()
        val controller = CadSceneController(runtime)
        assertFalse(controller.nodes(2316f,1080f,3f).any { it.id == "CAD.LAYER.WORKPIECE" && it.visible })
        controller.activate("CAD.LAYERS")
        val visible = controller.nodes(2316f,1080f,3f).filter { it.visible }.map { it.id }.toSet()
        CadLayer.entries.forEach { layer ->
            assertTrue("CAD.LAYER.${layer.name}" in visible)
            assertTrue("CAD.LAYER_VIS.${layer.name}" in visible)
        }
        assertTrue("CAD.LAYER_ASSIGN" in visible)
        controller.activate("CAD.LAYER.CENTERLINE")
        assertEquals(CadCommand.SetActiveLayer(CadLayer.CENTERLINE), runtime.last)
        controller.activate("CAD.LAYER_VIS.CENTERLINE")
        assertEquals(CadCommand.ToggleLayerVisibility(CadLayer.CENTERLINE), runtime.last)
        controller.activate("CAD.LAYER_ASSIGN")
        assertEquals(CadCommand.AssignSelectionToLayer(CadLayer.CENTERLINE), runtime.last)
    }
}
