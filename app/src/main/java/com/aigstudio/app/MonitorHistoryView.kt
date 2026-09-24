package com.aigstudio.app

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.View
import kotlin.math.max

data class MonitorSample(
    val fps: Double,
    val frameTimeMs: Double,
    val temperatureC: Double?,
    val ramMb: Double
)

class MonitorHistoryView(context: Context) : View(context) {
    var samples: List<MonitorSample> = emptyList()
        set(value) {
            field = value
            invalidate()
        }

    private val grid = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(50, 180, 210, 230)
        strokeWidth = 1f
    }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(220, 235, 245)
        textSize = 26f
    }
    private val fpsPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(61,235,255); strokeWidth = 3f; style = Paint.Style.STROKE }
    private val framePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(245,158,11); strokeWidth = 3f; style = Paint.Style.STROKE }
    private val tempPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(239,68,68); strokeWidth = 3f; style = Paint.Style.STROKE }
    private val ramPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(139,92,246); strokeWidth = 3f; style = Paint.Style.STROKE }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawColor(Color.rgb(7, 17, 27))
        val left = 18f
        val right = width - 18f
        val top = 42f
        val bottom = height - 26f
        if (right <= left || bottom <= top) return

        repeat(5) { i ->
            val y = top + (bottom - top) * i / 4f
            canvas.drawLine(left, y, right, y, grid)
        }

        canvas.drawText("FPS", left, 28f, fpsPaint.asText())
        canvas.drawText("Frame ms", left + 90f, 28f, framePaint.asText())
        canvas.drawText("BAT °C", left + 240f, 28f, tempPaint.asText())
        canvas.drawText("RAM MB", left + 360f, 28f, ramPaint.asText())

        if (samples.size < 2) {
            canvas.drawText("Collecting history…", left, (top + bottom) / 2f, text)
            return
        }

        drawSeries(canvas, samples.map { it.fps }, left, right, top, bottom, fpsPaint, 0.0)
        drawSeries(canvas, samples.map { it.frameTimeMs }, left, right, top, bottom, framePaint, 0.0)
        drawSeries(canvas, samples.mapNotNull { it.temperatureC }, left, right, top, bottom, tempPaint, null)
        drawSeries(canvas, samples.map { it.ramMb }, left, right, top, bottom, ramPaint, 0.0)
    }

    private fun Paint.asText(): Paint = Paint(this).apply {
        style = Paint.Style.FILL
        textSize = 24f
    }

    private fun drawSeries(
        canvas: Canvas,
        values: List<Double>,
        left: Float,
        right: Float,
        top: Float,
        bottom: Float,
        paint: Paint,
        fixedMin: Double?
    ) {
        if (values.size < 2) return
        var minV = fixedMin ?: values.minOrNull() ?: return
        var maxV = values.maxOrNull() ?: return
        if (maxV - minV < 0.001) {
            minV -= 0.5
            maxV += 0.5
        }
        val p = Path()
        values.forEachIndexed { i, value ->
            val x = left + (right - left) * i / max(1, values.lastIndex).toFloat()
            val norm = ((value - minV) / (maxV - minV)).coerceIn(0.0, 1.0)
            val y = bottom - (bottom - top) * norm.toFloat()
            if (i == 0) p.moveTo(x, y) else p.lineTo(x, y)
        }
        canvas.drawPath(p, paint)
    }
}
