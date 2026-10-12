package com.aig.feature.cad

import android.content.Context
import android.graphics.*
import android.view.MotionEvent
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import com.aig.core.cad.*
import com.aig.core.ui.R as UiR
import com.aig.core.ui.UiKit
import kotlin.math.*

class CadCanvasView(
    context: Context,
    private val doc: CadDocument,
    private val status: TextView
) : View(context) {
    private val entityPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.CYAN
        strokeWidth = 3f
        style = Paint.Style.STROKE
    }
    private val selectedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.MAGENTA
        strokeWidth = 5f
        style = Paint.Style.STROKE
    }
    private val gridPaint = Paint().apply { color = Color.rgb(15, 65, 78) }
    private val axisPaint = Paint().apply {
        color = Color.rgb(0, 210, 235)
        strokeWidth = 3f
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.LTGRAY
        textSize = 28f
    }
    private var first: PointMm? = null
    private var second: PointMm? = null
    private val scale = 4f

    init { setBackgroundColor(Color.argb(244, 2, 4, 7)) }

    private fun point(e: MotionEvent) = doc.snap(
        CadPrecision.point(
            ((e.x - width / 2f) / scale).toDouble(),
            ((height / 2f - e.y) / scale).toDouble()
        )
    )

    private fun sx(x: Double) = width / 2f + (x * scale).toFloat()
    private fun sy(y: Double) = height / 2f - (y * scale).toFloat()

    override fun onTouchEvent(e: MotionEvent): Boolean {
        if (e.action != MotionEvent.ACTION_UP) return true
        val q = point(e)

        if (doc.activeTool == CadTool.SELECT) {
            status.text = if (doc.selectNearest(q)) "SELECT • ${doc.selected.size} selected" else "SELECT • no hit"
            invalidate()
            return true
        }

        if (doc.activeTool == CadTool.ARC) {
            if (first == null) {
                first = q
                status.text = "ARC P1"
                return true
            }
            if (second == null) {
                second = q
                status.text = "ARC P2"
                return true
            }
            val entity = arc(first!!, second!!, q)
            if (entity != null) doc.add(entity)
            status.text = if (entity != null) "ARC 建立" else "ARC 三點共線"
            first = null
            second = null
            invalidate()
            return true
        }

        val a = first
        if (a == null) {
            first = q
            status.text = "${doc.activeTool} P1 X${"%.3f".format(q.x)} Y${"%.3f".format(q.y)}"
            return true
        }

        when (doc.activeTool) {
            CadTool.LINE -> doc.add(CadLine(a, q))
            CadTool.RECT -> doc.add(CadRect(a, q))
            CadTool.CIRCLE -> doc.add(CadCircle(a, hypot(q.x - a.x, q.y - a.y)))
            CadTool.HOLE -> doc.add(CadHole(a, hypot(q.x - a.x, q.y - a.y)))
            else -> {
                status.text = "${doc.activeTool}：先 SELECT 幾何再執行"
                first = null
                return true
            }
        }
        first = null
        status.text = "已建立 ${doc.activeTool} • entities=${doc.entities.size}"
        invalidate()
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val ox = width / 2f
        val oy = height / 2f
        val step = 80f
        var x = ox % step
        while (x < width) {
            canvas.drawLine(x, 0f, x, height.toFloat(), gridPaint)
            x += step
        }
        var y = oy % step
        while (y < height) {
            canvas.drawLine(0f, y, width.toFloat(), y, gridPaint)
            y += step
        }
        canvas.drawLine(ox, 0f, ox, height.toFloat(), axisPaint)
        canvas.drawLine(0f, oy, width.toFloat(), oy, axisPaint)
        canvas.drawText("原點 X0.000 Y0.000", ox + 10f, oy - 12f, textPaint)

        doc.entities.forEachIndexed { index, entity ->
            val paint = if (index in doc.selected) selectedPaint else entityPaint
            when (entity) {
                is CadLine -> canvas.drawLine(sx(entity.a.x), sy(entity.a.y), sx(entity.b.x), sy(entity.b.y), paint)
                is CadRect -> canvas.drawRect(
                    sx(min(entity.a.x, entity.b.x)),
                    sy(max(entity.a.y, entity.b.y)),
                    sx(max(entity.a.x, entity.b.x)),
                    sy(min(entity.a.y, entity.b.y)),
                    paint
                )
                is CadCircle -> canvas.drawCircle(sx(entity.center.x), sy(entity.center.y), (entity.radius * scale).toFloat(), paint)
                is CadHole -> {
                    canvas.drawCircle(sx(entity.center.x), sy(entity.center.y), (entity.radius * scale).toFloat(), paint)
                    canvas.drawLine(sx(entity.center.x) - 12f, sy(entity.center.y), sx(entity.center.x) + 12f, sy(entity.center.y), paint)
                }
                is CadArc -> {
                    val r = (entity.radius * scale).toFloat()
                    canvas.drawArc(
                        RectF(sx(entity.center.x) - r, sy(entity.center.y) - r, sx(entity.center.x) + r, sy(entity.center.y) + r),
                        (-entity.startDeg).toFloat(),
                        (-entity.sweepDeg).toFloat(),
                        false,
                        paint
                    )
                }
                is CadPolyline -> {
                    if (entity.points.isNotEmpty()) {
                        val path = Path()
                        path.moveTo(sx(entity.points[0].x), sy(entity.points[0].y))
                        entity.points.drop(1).forEach { path.lineTo(sx(it.x), sy(it.y)) }
                        if (entity.closed) path.close()
                        canvas.drawPath(path, paint)
                    }
                }
                is CadRoundRect -> {
                    val left = sx(min(entity.a.x, entity.b.x))
                    val right = sx(max(entity.a.x, entity.b.x))
                    val top = sy(max(entity.a.y, entity.b.y))
                    val bottom = sy(min(entity.a.y, entity.b.y))
                    val radius = (entity.radius * scale).toFloat()
                    canvas.drawRoundRect(RectF(left, top, right, bottom), radius, radius, paint)
                }
            }
        }
    }

    private fun arc(a: PointMm, b: PointMm, c: PointMm): CadArc? {
        val d = 2.0 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
        if (abs(d) < 1e-9) return null
        val a2 = a.x * a.x + a.y * a.y
        val b2 = b.x * b.x + b.y * b.y
        val c2 = c.x * c.x + c.y * c.y
        val ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d
        val uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d

        fun degrees(p: PointMm) = Math.toDegrees(atan2(p.y - uy, p.x - ux))
        fun normalize(value: Double) = ((value % 360.0) + 360.0) % 360.0

        val start = degrees(a)
        val middle = degrees(b)
        val end = degrees(c)
        val counterClockwise = normalize(end - start)
        val sweep = if (normalize(middle - start) <= counterClockwise) counterClockwise else counterClockwise - 360.0
        return CadArc(PointMm(ux, uy), hypot(a.x - ux, a.y - uy), start, sweep)
    }
}

object CadFeatureView {
    fun create(context: Context): LinearLayout {
        val doc = CadDocument()
        val root = UiKit.column(context)
        root.addView(UiKit.skinBanner(context, UiR.drawable.aig_cad, 76))
        val status = UiKit.statusLabel(context, "CAD READY • 0.001 mm • X0.000 Y0.000 • SNAP ON")
        root.addView(status)

        lateinit var canvas: CadCanvasView
        val drawTools = UiKit.toolGrid(context, 5)
        listOf(CadTool.SELECT, CadTool.LINE, CadTool.RECT, CadTool.CIRCLE, CadTool.ARC, CadTool.HOLE).forEach { tool ->
            UiKit.addGridButton(drawTools, tool.name) {
                doc.activeTool = tool
                status.text = "CAD TOOL = ${tool.name}"
            }
        }
        UiKit.addGridButton(drawTools, "UNDO") { doc.undo(); canvas.invalidate() }
        UiKit.addGridButton(drawTools, "REDO") { doc.redo(); canvas.invalidate() }
        UiKit.addGridButton(drawTools, "SNAP") {
            doc.snapEnabled = !doc.snapEnabled
            status.text = "SNAP ${if (doc.snapEnabled) "ON" else "OFF"}"
        }
        UiKit.addGridButton(drawTools, "CLEAR SEL") { doc.clearSelection(); canvas.invalidate() }
        root.addView(drawTools)

        canvas = CadCanvasView(context, doc, status)
        root.addView(canvas, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

        val editTools = UiKit.toolGrid(context, 5)
        UiKit.addGridButton(editTools, "TRIM") { status.text = if (doc.trimSelected()) "TRIM 完成" else "TRIM：先 SELECT"; canvas.invalidate() }
        UiKit.addGridButton(editTools, "EXTEND") { status.text = if (doc.extendSelected()) "EXTEND 完成" else "EXTEND：先 SELECT"; canvas.invalidate() }
        UiKit.addGridButton(editTools, "OFFSET +5") { status.text = if (doc.offsetSelected()) "OFFSET 5.000 mm" else "OFFSET：先 SELECT"; canvas.invalidate() }
        UiKit.addGridButton(editTools, "ARRAY ×3") { status.text = if (doc.arraySelected()) "ARRAY ×3" else "ARRAY：先 SELECT"; canvas.invalidate() }
        UiKit.addGridButton(editTools, "CHAMFER") { status.text = if (doc.chamferSelected()) "CHAMFER 5.000" else "CHAMFER：先 SELECT RECT"; canvas.invalidate() }
        UiKit.addGridButton(editTools, "FILLET") { status.text = if (doc.filletSelected()) "FILLET R5.000" else "FILLET：先 SELECT RECT"; canvas.invalidate() }
        root.addView(editTools)
        return root
    }
}
