package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*

class NcSceneController(private val runtime:NcRuntimePort){
    fun nodes(widthPx:Float,heightPx:Float,density:Float)=NcSceneLayout.nodes(widthPx,heightPx,density,runtime.snapshot())
    fun activate(nodeId:String):NcDispatchResult?{
        if(!nodeId.startsWith("NC."))return null
        val command=NcSceneLayout.commandFor(nodeId,runtime.snapshot())?:return null
        return runtime.dispatch(command)
    }
    fun state()=runtime.snapshot()
}