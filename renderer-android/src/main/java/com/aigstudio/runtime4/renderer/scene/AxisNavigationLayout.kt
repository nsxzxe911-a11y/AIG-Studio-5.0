package com.aigstudio.runtime4.renderer

import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max

data class AxisNavigationResult(
    val top: Float,
    val buttons: List<RgbGlassButtonNode>,
)

object AxisNavigationLayout {
    private data class Spec(val id:String,val label:String,val texture:String?=null)
    private data class Metrics(val touch:Float,val gap:Float,val columns:Int,val rows:Int,val buttonWidth:Float,val top:Float)
    private val specs=listOf(
        Spec("NAV.HOME","HOME","aig-rgb/icons/workspace.png"),
        Spec("NAV.CAD","CAD","aig-rgb/icons/cad.png"),
        Spec("NAV.CAM","CAM","aig-rgb/icons/cam.png"),
        Spec("NAV.SIM","SIM"),
        Spec("NAV.3AX","3AX"),
        Spec("NAV.4AX","4AX"),
        Spec("NAV.5AX","5AX"),
        Spec("NAV.6AX","6AX"),
        Spec("NAV.NC","NC"),
        Spec("NAV.AI","AI"),
    )

    private fun metrics(widthPx:Float,heightPx:Float,density:Float):Metrics {
        val touch=SharedVisualPolicy.touchPx(density)
        val gap=SharedVisualPolicy.gapPx(density)
        val maxColumns=max(1,floor((widthPx-gap)/(touch+gap)).toInt())
        val columns=max(1,minOf(specs.size+1,maxColumns))
        val rows=ceil(specs.size.toDouble()/columns.toDouble()).toInt()
        val buttonWidth=max(touch,(widthPx-gap*(columns+1))/columns)
        val navHeight=gap+rows*(touch+gap)
        val top=(heightPx-navHeight).coerceAtLeast(0f)
        return Metrics(touch,gap,columns,rows,buttonWidth,top)
    }

    fun layout(widthPx:Float,heightPx:Float,density:Float,selectedId:String):AxisNavigationResult {
        val m=metrics(widthPx,heightPx,density)
        val buttons=specs.mapIndexed{index,spec->
            val row=index/m.columns;val col=index%m.columns
            val left=m.gap+col*(m.buttonWidth+m.gap);val y=m.top+m.gap+row*(m.touch+m.gap)
            RgbGlassButtonNode(
                spec.id,UiBounds(left,y,(left+m.buttonWidth).coerceAtMost(widthPx-m.gap),(y+m.touch).coerceAtMost(heightPx-m.gap)),50,
                spec.label,spec.texture,null,if(spec.id==selectedId)VisualState.SELECTED else VisualState.NORMAL,skinRole=RgbSkinRole.NAVIGATION
            )
        }
        return AxisNavigationResult(m.top,buttons)
    }

    fun freeSlots(widthPx:Float,heightPx:Float,density:Float):List<UiBounds> {
        val m=metrics(widthPx,heightPx,density)
        val occupiedLast=specs.size-(m.rows-1)*m.columns
        if(occupiedLast>=m.columns)return emptyList()
        val row=m.rows-1
        return (occupiedLast until m.columns).map{col->
            val left=m.gap+col*(m.buttonWidth+m.gap);val y=m.top+m.gap+row*(m.touch+m.gap)
            UiBounds(left,y,(left+m.buttonWidth).coerceAtMost(widthPx-m.gap),(y+m.touch).coerceAtMost(heightPx-m.gap))
        }
    }
}
