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
    private val specs=listOf(
        Spec("NAV.HOME","HOME","aig-rgb/icons/workspace.png"),
        Spec("NAV.CAD","CAD","aig-rgb/icons/cad.png"),
        Spec("NAV.CAM","CAM","aig-rgb/icons/cam.png"),
        Spec("NAV.3AX","3AX"),
        Spec("NAV.4AX","4AX"),
        Spec("NAV.5AX","5AX"),
        Spec("NAV.6AX","6AX"),
        Spec("NAV.NC","NC"),
    )

    fun layout(widthPx:Float,heightPx:Float,density:Float,selectedId:String):AxisNavigationResult {
        val touch=SharedVisualPolicy.touchPx(density)
        val gap=SharedVisualPolicy.gapPx(density)
        val maxColumns=max(1,floor((widthPx-gap)/(touch+gap)).toInt())
        val columns=max(1,minOf(specs.size,maxColumns))
        val rows=ceil(specs.size.toDouble()/columns.toDouble()).toInt()
        val buttonWidth=max(touch,(widthPx-gap*(columns+1))/columns)
        val navHeight=gap+rows*(touch+gap)
        val top=(heightPx-navHeight).coerceAtLeast(0f)
        val buttons=specs.mapIndexed{index,spec->
            val row=index/columns;val col=index%columns
            val left=gap+col*(buttonWidth+gap);val y=top+gap+row*(touch+gap)
            RgbGlassButtonNode(
                spec.id,UiBounds(left,y,(left+buttonWidth).coerceAtMost(widthPx-gap),(y+touch).coerceAtMost(heightPx-gap)),50,
                spec.label,spec.texture,null,if(spec.id==selectedId)VisualState.SELECTED else VisualState.NORMAL,skinRole=RgbSkinRole.NAVIGATION
            )
        }
        return AxisNavigationResult(top,buttons)
    }
}