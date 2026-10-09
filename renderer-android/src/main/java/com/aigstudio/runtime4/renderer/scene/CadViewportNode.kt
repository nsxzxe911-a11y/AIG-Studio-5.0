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
