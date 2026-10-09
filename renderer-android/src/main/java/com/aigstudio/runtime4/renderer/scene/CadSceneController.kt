package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*

class CadSceneController(private val runtime:CadRuntimePort){
    private var toolGroupExpanded=false; private var layerGroupExpanded=false; private var dimensionGroupExpanded=false
    private var dimensionKind=CadDimensionKind.LENGTH
    fun nodes(widthPx:Float,heightPx:Float,density:Float)=CadSceneLayout.nodes(widthPx,heightPx,density,toolGroupExpanded,layerGroupExpanded,dimensionGroupExpanded)
    fun activate(nodeId:String):CadDispatchResult?{
        if(nodeId=="CAD.TOOL_GROUP"){toolGroupExpanded=!toolGroupExpanded;if(toolGroupExpanded){layerGroupExpanded=false;dimensionGroupExpanded=false};return null}
        if(nodeId=="CAD.LAYERS"){layerGroupExpanded=!layerGroupExpanded;if(layerGroupExpanded){toolGroupExpanded=false;dimensionGroupExpanded=false};return null}
        if(nodeId=="CAD.DIMENSION"){dimensionGroupExpanded=!dimensionGroupExpanded;if(dimensionGroupExpanded){toolGroupExpanded=false;layerGroupExpanded=false};return null}
        if(nodeId=="CAD.LAYER_ASSIGN")return runtime.dispatch(CadCommand.AssignSelectionToLayer(runtime.snapshot().activeLayer))
        if(nodeId.startsWith("CAD.DIM_KIND.")){dimensionKind=CadDimensionKind.valueOf(nodeId.substringAfter("CAD.DIM_KIND."));return null}
        if(nodeId.startsWith("CAD.DIM_VALUE."))return runtime.dispatch(CadCommand.ApplySelectedDimension(dimensionKind,nodeId.substringAfter("CAD.DIM_VALUE.").toDouble()))
        val command=CadSceneLayout.commandFor(nodeId)?:return null
        return runtime.dispatch(command)
    }
    fun state()=runtime.snapshot()
}
