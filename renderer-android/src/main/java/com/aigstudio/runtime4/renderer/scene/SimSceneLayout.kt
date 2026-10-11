package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.contract.ui.AigUiLocalization
import kotlin.math.max

object SimSceneLayout {
    fun nodes(w:Float,h:Float,d:Float):List<SceneNode>{
        val touch=SharedVisualPolicy.touchPx(d);val gap=SharedVisualPolicy.gapPx(d)
        val descriptor=SimProfessionalDescriptor.descriptor()
        val controls=descriptor.components.filter{it.visible&&it.controlId.startsWith("SIM.")&&it.controlId !in setOf("SIM.CONTROL_DECK","SIM.VIEWPORT.FRAME")}
        val columns=4
        val button=max(touch,(w-gap*(columns+1))/columns)
        val deckTop=gap;val deckBottom=deckTop+gap+touch+gap
        val bounds=linkedMapOf<String,UiBounds>()
        bounds["SIM.CONTROL_DECK"]=UiBounds(gap,deckTop,w-gap,deckBottom)
        controls.forEachIndexed{index,component->
            val left=gap*2+index*(button+gap);val top=deckTop+gap
            bounds[component.controlId]=UiBounds(left,top,(left+button).coerceAtMost(w-gap*2),top+touch)
        }
        val nav=AxisNavigationLayout.layout(w,h,d,"NAV.SIM")
        val frameTop=deckBottom+gap
        val frameBottom=(nav.top-gap).coerceAtLeast(frameTop+touch)
        bounds["SIM.VIEWPORT.FRAME"]=UiBounds(gap,frameTop,w-gap,frameBottom)
        val nodes=AigComponentNodeAdapter.nodes(descriptor,AigPageLayout(bounds,AigUiLocalization.labels("zh-TW"),emptySet(),20)).toMutableList<SceneNode>()
        val inset=2f*d
        nodes+=SceneNode("SIM.VIEWPORT",UiBounds(gap+inset,frameTop+inset,w-gap-inset,frameBottom-inset),1)
        nodes+=nav.buttons
        return nodes
    }
}

class SimSceneController(private val runtime:SimRuntimePort){
    fun nodes(w:Float,h:Float,d:Float)=SimSceneLayout.nodes(w,h,d)
    fun activate(id:String):SimState?=when(id){
        "SIM.PLAY"->runtime.run()
        "SIM.STEP"->runtime.step()
        "SIM.RESET"->runtime.reset()
        "SIM.DISPLAY"->runtime.toggleDisplay()
        else->null
    }
}
