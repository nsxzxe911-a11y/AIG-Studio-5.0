package com.aigstudio.runtime4.renderer.gpu

import com.aigstudio.runtime4.renderer.UiBounds
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

object GlesGeometryBuffer {
    fun buffer(values: FloatArray): FloatBuffer = ByteBuffer
        .allocateDirect(values.size * 4)
        .order(ByteOrder.nativeOrder())
        .asFloatBuffer()
        .apply { put(values); position(0) }

    fun quad(bounds: UiBounds): FloatArray = floatArrayOf(
        bounds.left,bounds.top,0f,0f, bounds.right,bounds.top,1f,0f, bounds.left,bounds.bottom,0f,1f,
        bounds.left,bounds.bottom,0f,1f, bounds.right,bounds.top,1f,0f, bounds.right,bounds.bottom,1f,1f,
    )

    fun line(ax: Float, ay: Float, bx: Float, by: Float): FloatArray = floatArrayOf(
        ax,ay,0f,0f, bx,by,0f,0f,
    )

    fun polyline(points: List<Pair<Float,Float>>): FloatArray {
        val out = FloatArray(points.size * 4)
        points.forEachIndexed { i, p ->
            out[i*4] = p.first; out[i*4+1] = p.second
            out[i*4+2] = 0f; out[i*4+3] = 0f
        }
        return out
    }

    fun circle(cx: Float, cy: Float, radius: Float, startDeg: Double = 0.0, sweepDeg: Double = 360.0, segments: Int = 64): FloatArray {
        val pts = (0..segments).map { i ->
            val a = Math.toRadians(startDeg + sweepDeg * i.toDouble() / segments.toDouble())
            Pair(cx + (cos(a) * radius).toFloat(), cy - (sin(a) * radius).toFloat())
        }
        return polyline(pts)
    }
}
