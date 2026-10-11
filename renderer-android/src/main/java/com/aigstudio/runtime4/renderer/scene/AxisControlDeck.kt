package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.AxisMode
import kotlin.math.ceil
import kotlin.math.max

enum class AxisControlAction { VIEW, AXIS, PLAY, DISPLAY, A_MINUS, A_PLUS, B_MINUS, B_PLUS, C_MINUS, C_PLUS }

data class AxisControlDescriptor(
    val controlId:String,
    val action:AxisControlAction,
    val group:String,
    val label:String,
    val enabled:Boolean=true,
    val selected:Boolean=false,
    val requiresConnection:Boolean=false,
)

data class AxisControlLayout(val nodes:List<SceneNode>,val viewportTop:Float)

object AxisControlDeck {
    private val primary=listOf(
        AxisControlAction.VIEW to "VIEW",AxisControlAction.AXIS to "AXIS",AxisControlAction.PLAY to "PLAY",AxisControlAction.DISPLAY to "DISPLAY"
    )
    private fun rotaries(mode:AxisMode):List<Pair<AxisControlAction,String>> = when(mode){
        AxisMode.AXIS3->emptyList()
        AxisMode.AXIS4->listOf(AxisControlAction.A_MINUS to "A−",AxisControlAction.A_PLUS to "A+")
        AxisMode.AXIS5->listOf(AxisControlAction.A_MINUS to "A−",AxisControlAction.A_PLUS to "A+",AxisControlAction.B_MINUS to "B−",AxisControlAction.B_PLUS to "B+")
        AxisMode.AXIS6->listOf(AxisControlAction.A_MINUS to "A−",AxisControlAction.A_PLUS to "A+",AxisControlAction.B_MINUS to "B−",AxisControlAction.B_PLUS to "B+",AxisControlAction.C_MINUS to "C−",AxisControlAction.C_PLUS to "C+")
    }
    fun forMode(mode:AxisMode):List<AxisControlDescriptor>{
        val prefix=when(mode){AxisMode.AXIS3->"AXIS3";AxisMode.AXIS4->"AXIS4";AxisMode.AXIS5->"AXIS5";AxisMode.AXIS6->"AXIS6"}
        return (primary.map{(a,l)->Triple(a,l,"PRIMARY")}+rotaries(mode).map{(a,l)->Triple(a,l,"ROTARY")}).map{(a,l,g)->
            AxisControlDescriptor(prefix+"."+a.name,a,g,l,enabled=true,selected=false,requiresConnection=false)
        }
    }
    fun layout(mode:AxisMode,widthPx:Float,heightPx:Float,density:Float):AxisControlLayout{
        val descriptors=forMode(mode);val touch=SharedVisualPolicy.touchPx(density);val gap=SharedVisualPolicy.gapPx(density)
        val desired=if(widthPx>=heightPx)6 else 4;val columns=max(1,minOf(desired,descriptors.size));val rows=ceil(descriptors.size.toDouble()/columns).toInt()
        val buttonWidth=max(touch,(widthPx-gap*(columns+1))/columns);val top=gap;val controls=descriptors.mapIndexed{index,d->
            val row=index/columns;val col=index%columns;val left=gap+col*(buttonWidth+gap);val y=top+row*(touch+gap)
            RgbGlassButtonNode(d.controlId,UiBounds(left,y,(left+buttonWidth).coerceAtMost(widthPx-gap),y+touch),30,d.label,null,null,if(d.selected)VisualState.SELECTED else VisualState.NORMAL,d.enabled,true,skinRole=RgbSkinRole.CONTROL)
        }
        val bottom=top+rows*touch+(rows-1).coerceAtLeast(0)*gap;val panel=RgbGlassPanelNode(mode.name+".CONTROL_SKIN",UiBounds(gap/2f,gap/2f,widthPx-gap/2f,bottom+gap/2f),20)
        return AxisControlLayout(listOf(panel)+controls,bottom+gap)
    }
}