package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*

class CadSceneController(private val runtime:CadRuntimePort) {
    private var toolGroupExpanded=false
    private var layerGroupExpanded=false

    fun nodes(widthPx:Float,heightPx:Float,density:Float):List<SceneNode> =
        CadSceneLayout.nodes(widthPx,heightPx,density,toolGroupExpanded,layerGroupExpanded)

    fun activate(nodeId:String):CadDispatchResult? {
        if(nodeId=="CAD.TOOL_GROUP") {
            toolGroupExpanded=!toolGroupExpanded
            if(toolGroupExpanded) layerGroupExpanded=false
            return null
        }
        if(nodeId=="CAD.LAYERS") {
            layerGroupExpanded=!layerGroupExpanded
            if(layerGroupExpanded) toolGroupExpanded=false
            return null
        }
        if(nodeId=="CAD.LAYER_ASSIGN") {
            return runtime.dispatch(CadCommand.AssignSelectionToLayer(runtime.snapshot().activeLayer))
        }
        val command=CadSceneLayout.commandFor(nodeId) ?: return null
        return runtime.dispatch(command)
    }

    fun state()=runtime.snapshot()
}
