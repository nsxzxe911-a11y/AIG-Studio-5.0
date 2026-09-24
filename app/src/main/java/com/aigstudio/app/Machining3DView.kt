package com.aigstudio.app

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import com.aigstudio.core.*
import kotlin.math.*

class Machining3DView(
    context: Context,
    private val result: Machining3DResult
) : View(context) {
    private data class ScreenPoint(val x: Float, val y: Float, val depth: Double)

    private var rotateX = -35.0
    private var rotateY = 35.0
    private var zoom = 1.0
    private var panX = 0f
    private var panY = 0f
    private var lastX = 0f
    private var lastY = 0f
    private var lastFocusX = 0f
    private var lastFocusY = 0f

    private val surfacePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        isDither = true
    }
    private val edgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 0.8f
        color = Color.argb(90, 160, 230, 255)
    }
    private val rapidPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
        strokeCap = Paint.Cap.ROUND
        color = Color.argb(150, 255, 70, 220)
    }
    private val cutPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f
        strokeCap = Paint.Cap.ROUND
        color = Color.rgb(63, 255, 157)
    }
    private val toolPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f
        color = Color.rgb(245, 158, 11)
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(225, 240, 255)
        textSize = 12f * resources.displayMetrics.scaledDensity
    }
    private val trianglePath = Path()

    private val scaleDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                zoom = (zoom * detector.scaleFactor).coerceIn(0.35, 6.0)
                postInvalidateOnAnimation()
                return true
            }
        }
    )

    init {
        setBackgroundColor(Color.rgb(5, 10, 17))
        setLayerType(LAYER_TYPE_HARDWARE, null)
    }

    private fun centroid(event: MotionEvent): Pair<Float, Float> {
        var x = 0f
        var y = 0f
        for (i in 0 until event.pointerCount) {
            x += event.getX(i)
            y += event.getY(i)
        }
        return x / event.pointerCount to y / event.pointerCount
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        scaleDetector.onTouchEvent(event)

        if (event.pointerCount >= 2) {
            val focus = centroid(event)
            when (event.actionMasked) {
                MotionEvent.ACTION_POINTER_DOWN, MotionEvent.ACTION_DOWN -> {
                    lastFocusX = focus.first
                    lastFocusY = focus.second
                }
                MotionEvent.ACTION_MOVE -> {
                    if (!scaleDetector.isInProgress) {
                        panX += focus.first - lastFocusX
                        panY += focus.second - lastFocusY
                    }
                    lastFocusX = focus.first
                    lastFocusY = focus.second
                    postInvalidateOnAnimation()
                }
            }
            return true
        }

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x
                lastY = event.y
                return true
            }
            MotionEvent.ACTION_MOVE -> {
                rotateY = (rotateY + (event.x - lastX) * 0.35) % 360.0
                rotateX = (rotateX + (event.y - lastY) * 0.35).coerceIn(-89.0, 89.0)
                lastX = event.x
                lastY = event.y
                postInvalidateOnAnimation()
                return true
            }
        }
        return true
    }

    private fun rotate(v: Vec3): Vec3 {
        val stock = result.stock
        val cx = (stock.minX + stock.maxX) / 2.0
        val cy = (stock.minY + stock.maxY) / 2.0
        val cz = -stock.thickness / 2.0

        var x = v.x - cx
        var y = v.y - cy
        var z = v.z - cz

        val ax = Math.toRadians(rotateX)
        val ay = Math.toRadians(rotateY)

        val y1 = y * cos(ax) - z * sin(ax)
        val z1 = y * sin(ax) + z * cos(ax)
        y = y1
        z = z1

        val x1 = x * cos(ay) + z * sin(ay)
        val z2 = -x * sin(ay) + z * cos(ay)
        x = x1
        z = z2
        return Vec3(x, y, z)
    }

    private fun project(v: Vec3, scale: Double): ScreenPoint {
        val r = rotate(v)
        return ScreenPoint(
            (width / 2f + panX + r.x * scale).toFloat(),
            (height / 2f + panY - r.y * scale).toFloat(),
            r.z
        )
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (width <= 0 || height <= 0) return

        val stockW = result.stock.maxX - result.stock.minX
        val stockH = result.stock.maxY - result.stock.minY
        val span = max(max(stockW, stockH), result.stock.thickness).coerceAtLeast(1.0)
        val scale = min(width, height) * 0.72 / span * zoom

        val projected = result.mesh.vertices.map { project(it, scale) }
        val triangles = result.mesh.triangles
        val stride = max(1, ceil(triangles.size / 5500.0).toInt())
        val visible = triangles.indices
            .filter { it % stride == 0 }
            .sortedBy { index ->
                val triangle = triangles[index]
                (projected[triangle.a].depth + projected[triangle.b].depth + projected[triangle.c].depth) / 3.0
            }

        for (index in visible) {
            val triangle = triangles[index]
            val a = projected[triangle.a]
            val b = projected[triangle.b]
            val d = projected[triangle.c]
            val avgZ = (
                result.mesh.vertices[triangle.a].z +
                    result.mesh.vertices[triangle.b].z +
                    result.mesh.vertices[triangle.c].z
                ) / 3.0
            val cutRatio = (-avgZ / result.stock.thickness).coerceIn(0.0, 1.0)
            surfacePaint.color = Color.argb(
                215,
                (20 + 45 * cutRatio).roundToInt(),
                (115 + 105 * (1.0 - cutRatio)).roundToInt(),
                (175 + 65 * (1.0 - cutRatio)).roundToInt()
            )
            trianglePath.reset()
            trianglePath.moveTo(a.x, a.y)
            trianglePath.lineTo(b.x, b.y)
            trianglePath.lineTo(d.x, d.y)
            trianglePath.close()
            canvas.drawPath(trianglePath, surfacePaint)
            canvas.drawPath(trianglePath, edgePaint)
        }

        result.cam.toolpaths.forEach { toolpath ->
            var previous: Move? = null
            toolpath.moves.forEach { move ->
                val prev = previous
                if (prev != null) {
                    val a = project(Vec3(prev.to.x, prev.to.y, prev.z), scale)
                    val b = project(Vec3(move.to.x, move.to.y, move.z), scale)
                    canvas.drawLine(a.x, a.y, b.x, b.y, if (move.rapid) rapidPaint else cutPaint)
                }
                previous = move
            }
        }

        val lastMove = result.cam.toolpaths.lastOrNull()?.moves?.lastOrNull()
        if (lastMove != null) {
            val tip = project(Vec3(lastMove.to.x, lastMove.to.y, lastMove.z), scale)
            val top = project(
                Vec3(
                    lastMove.to.x,
                    lastMove.to.y,
                    lastMove.z + max(12.0, result.cam.settings.toolDiameter * 2.0)
                ),
                scale
            )
            canvas.drawLine(tip.x, tip.y, top.x, top.y, toolPaint)
            val radius = max(4f, (result.cam.settings.toolDiameter * scale * 0.12).toFloat())
            canvas.drawCircle(tip.x, tip.y, radius, toolPaint)
        }

        val removed = result.removal.depth.count { it < 0.0 }
        val label = "TRUE 3D • CAM=" + result.cam.toolpaths.size +
            " • removed=" + removed +
            " • 原點 X0.000 Y0.000 • 精度 0.001 mm"
        canvas.drawText(label, 14f, 24f, textPaint)
    }
}
