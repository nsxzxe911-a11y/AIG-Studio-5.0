package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class CadSceneGraphRegression {
    @Test fun arcControlsAreRealGpuNodesWithCommands() {
        val nodes=CadSceneLayout.nodes(2316f,1080f,3f,true)
        val arc=nodes.single{it.id=="CAD.ARC"} as RgbGlassButtonNode
        val dir=nodes.single{it.id=="CAD.ARC_DIR"} as RgbGlassButtonNode
        assertTrue(arc.visible); assertTrue(dir.visible)
        assertEquals(CadCommand.SelectTool(CadTool.ARC),arc.commandBinding)
        assertEquals(CadCommand.ToggleArcDirection,dir.commandBinding)
    }

    @Test fun layerPopupUsesGpuNodesAndRealLayerCommands() {
        class FakeRuntime:CadRuntimePort {
            var current=CadState.initial(); var last:CadCommand?=null
            override fun snapshot()=current
            override fun dispatch(command:CadCommand):CadDispatchResult { last=command; if(command is CadCommand.SetActiveLayer) current=current.copy(activeLayer=command.layer); return CadDispatchResult(true,current) }
        }
        val runtime=FakeRuntime(); val controller=CadSceneController(runtime)
        assertFalse(controller.nodes(2316f,1080f,3f).any{it.id=="CAD.LAYER.WORKPIECE"&&it.visible})
        controller.activate("CAD.LAYERS")
        val visible=controller.nodes(2316f,1080f,3f).filter{it.visible}.map{it.id}.toSet()
        CadLayer.entries.forEach{layer->assertTrue("CAD.LAYER.${layer.name}" in visible);assertTrue("CAD.LAYER_VIS.${layer.name}" in visible)}
        assertTrue("CAD.LAYER_ASSIGN" in visible)
        controller.activate("CAD.LAYER.CENTERLINE"); assertEquals(CadCommand.SetActiveLayer(CadLayer.CENTERLINE),runtime.last)
        controller.activate("CAD.LAYER_VIS.CENTERLINE"); assertEquals(CadCommand.ToggleLayerVisibility(CadLayer.CENTERLINE),runtime.last)
        controller.activate("CAD.LAYER_ASSIGN"); assertEquals(CadCommand.AssignSelectionToLayer(CadLayer.CENTERLINE),runtime.last)
    }

    @Test fun dimensionPopupDispatchesSelectedKindAndPreset() {
        class FakeRuntime:CadRuntimePort {
            var current=CadState.initial(); var last:CadCommand?=null
            override fun snapshot()=current
            override fun dispatch(command:CadCommand)=CadDispatchResult(true,current).also{last=command}
        }
        val runtime=FakeRuntime(); val controller=CadSceneController(runtime)
        controller.activate("CAD.DIMENSION")
        val visible=controller.nodes(2316f,1080f,3f).filter{it.visible}.map{it.id}.toSet()
        CadDimensionKind.entries.forEach{assertTrue("CAD.DIM_KIND.${it.name}" in visible)}
        listOf("1","5","10","25").forEach{assertTrue("CAD.DIM_VALUE.$it" in visible)}
        controller.activate("CAD.DIM_KIND.RADIUS")
        controller.activate("CAD.DIM_VALUE.5")
        assertEquals(CadCommand.ApplySelectedDimension(CadDimensionKind.RADIUS,5.0),runtime.last)
    }
}
