package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.CadPoint
import kotlin.math.max
import kotlin.math.min

class CadViewportNode(val viewport: UiBounds) {
    private val scale: Float = max(1f, min(viewport.width, viewport.height) / 200f)
    private val originX: Float = (viewport.left + viewport.right) * 0.5f
    private val originY: Float = (viewport.top + viewport.bottom) * 0.5f

    fun worldToScreen(x: Double, y: Double): Pair<Float, Float> =
        Pair(originX + x.toFloat() * scale, originY - y.toFloat() * scale)

    fun screenToWorld(x: Float, y: Float): CadPoint =
        CadPoint((x - originX).toDouble() / scale.toDouble(), (originY - y).toDouble() / scale.toDouble())

    fun mmScale(): Float = scale
}


data class CadSnapMarker(
    val centerX:Float, val centerY:Float,
    val diamond:List<Pair<Float,Float>>,
    val cross:List<Pair<Float,Float>>,
)

data class CadSnapPresentation(val hudLabel:String,val marker:CadSnapMarker?) {
    companion object {
        fun from(state:com.aigstudio.runtime4.contract.CadState,viewport:CadViewportNode,radiusPx:Float=8f):CadSnapPresentation {
            val preview=state.snapPreview
            val marker=if(state.snapMode==com.aigstudio.runtime4.contract.CadSnapMode.OFF || preview==null) null else {
                val (x,y)=viewport.worldToScreen(preview.x,preview.y)
                CadSnapMarker(x,y,
                    listOf(x to y-radiusPx,x+radiusPx to y,x to y+radiusPx,x-radiusPx to y,x to y-radiusPx),
                    listOf(x-radiusPx to y,x+radiusPx to y,x to y-radiusPx,x to y+radiusPx))
            }
            return CadSnapPresentation("SNAP=${state.snapMode.name}",marker)
        }
    }
}
