package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*

class CamSceneController(private val runtime:CamRuntimePort){
    fun nodes(widthPx:Float,heightPx:Float,density:Float)=CamSceneLayout.nodes(widthPx,heightPx,density,runtime.snapshot())
    fun activate(nodeId:String):CamDispatchResult?{
        if(!nodeId.startsWith("CAM."))return null
        val command=CamSceneLayout.commandFor(nodeId,runtime.snapshot())?:return null
        return runtime.dispatch(command)
    }
    fun state()=runtime.snapshot()
}
