package com.aigstudio.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.aigstudio.core.*
import kotlin.math.*

enum class Tool { LINE, RECT, CIRCLE, DELETE, CHAMFER, FILLET, PAN }

class MainActivity : Activity() {
    private lateinit var cad: CadView
    private lateinit var branchFlow: FlowLayout
    private lateinit var categoryFlow: FlowLayout
    private val toolButtons = mutableMapOf<Tool, Button>()
    private val categoryButtons = mutableMapOf<String, Button>()
    private var activeCategory: String? = null
    private val colors = listOf(
        0xFF00BCD4.toInt(), 0xFF8B5CF6.toInt(), 0xFFF59E0B.toInt(),
        0xFF22C55E.toInt(), 0xFFEF4444.toInt(), 0xFF3B82F6.toInt()
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF07111B.toInt())
        }
        val title = TextView(this).apply {
            text = "AIG Studio 5.0 • 2D CAD • 原點 0.000 • 精度 0.001 mm"
            setTextColor(Color.WHITE); textSize = 15f; gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), dp(6), dp(12), dp(6))
        }
        root.addView(title, LinearLayout.LayoutParams(-1, dp(40)))
        cad = CadView(this)
        root.addView(cad, LinearLayout.LayoutParams(-1, 0, 1f))

        // Branch area: hidden until a category is selected.  This keeps the CAD canvas clean.
        branchFlow = FlowLayout(this).apply { setPadding(dp(6), dp(2), dp(6), dp(2)); visibility = View.GONE }
        root.addView(branchFlow, LinearLayout.LayoutParams(-1, -2))
        categoryFlow = FlowLayout(this).apply { setPadding(dp(6), dp(3), dp(6), dp(4)) }
        root.addView(categoryFlow, LinearLayout.LayoutParams(-1, -2))

        addCategory("繪圖", 0) { showDrawingBranch() }
        addCategory("修改", 3) { showModifyBranch() }
        addCategory("角部", 2) { showCornerBranch() }
        addCategory("AI", 1) { showAiBranch() }
        addActionTo(categoryFlow, "↶", 3) { cad.undo() }
        addActionTo(categoryFlow, "↷", 5) { cad.redo() }

        setContentView(root)
        openCategory("繪圖") { showDrawingBranch() }
        selectTool(Tool.LINE)
    }

    private fun showDrawingBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("線", Tool.LINE, 0)
        addToolToBranch("矩形", Tool.RECT, 1)
        addToolToBranch("圓", Tool.CIRCLE, 2)
    }
    private fun showModifyBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("刪除", Tool.DELETE, 4)
        addToolToBranch("移動", Tool.PAN, 0)
    }
    private fun showCornerBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addToolToBranch("C 倒角", Tool.CHAMFER, 2) {
            askValue("倒角 C 值", cad.chamferValue) { cad.chamferValue = it; selectTool(Tool.CHAMFER) }
        }
        addToolToBranch("R 角", Tool.FILLET, 1) {
            askValue("R 角半徑", cad.filletValue) { cad.filletValue = it; selectTool(Tool.FILLET) }
        }
    }
    private fun showAiBranch() {
        branchFlow.removeAllViews(); toolButtons.clear()
        addActionTo(branchFlow, "AI CAD 檢查", 3) { cad.aiInspect() }
    }

    private fun addCategory(label: String, colorIndex: Int, show: () -> Unit) {
        val b = toolButton(label + " ＋", colors[colorIndex])
        b.setOnClickListener {
            if (activeCategory == label) closeBranches() else openCategory(label, show)
        }
        categoryButtons[label] = b; categoryFlow.addView(b)
    }

    private fun openCategory(label: String, show: () -> Unit) {
        activeCategory = label
        categoryButtons.forEach { (name, b) -> styleButton(b, categoryColor(name), name == label) }
        branchFlow.visibility = View.VISIBLE
        show()
        // Changing category also clears the previous active tool light/state.
        toolButtons.values.forEach { it.alpha = 0.62f }
    }

    private fun closeBranches() {
        activeCategory = null; branchFlow.removeAllViews(); branchFlow.visibility = View.GONE
        categoryButtons.forEach { (name, b) -> styleButton(b, categoryColor(name), false) }
    }

    private fun categoryColor(name: String): Int = when(name) {
        "繪圖" -> colors[0]; "修改" -> colors[3]; "角部" -> colors[2]; else -> colors[1]
    }

    private fun selectTool(tool: Tool) {
        cad.setTool(tool)
        // Exactly one active tool: selecting a new one extinguishes every previous light.
        toolButtons.forEach { (t, b) -> styleButton(b, toolColor(t), selected = t == tool) }
    }
    private fun toolColor(tool: Tool): Int = when (tool) {
        Tool.LINE, Tool.PAN -> colors[0]; Tool.RECT, Tool.FILLET -> colors[1]
        Tool.CIRCLE, Tool.CHAMFER -> colors[2]; Tool.DELETE -> colors[4]
    }
    private fun addToolToBranch(label: String, tool: Tool, colorIndex: Int, onClick: (() -> Unit)? = null) {
        val b = toolButton("└─ $label", colors[colorIndex % colors.size])
        b.alpha = 0.72f
        b.setOnClickListener { if (onClick != null) onClick() else selectTool(tool) }
        toolButtons[tool] = b; branchFlow.addView(b)
    }
    private fun addActionTo(parent: FlowLayout, label: String, colorIndex: Int, run: () -> Unit) {
        val b = toolButton(label, colors[colorIndex]); b.setOnClickListener { run() }; parent.addView(b)
    }
    private fun toolButton(label: String, color: Int) = Button(this).apply {
        text = label; setTextColor(Color.WHITE); textSize = 13f; minWidth = dp(64); minHeight = dp(50)
        isAllCaps = false; elevation = dp(3).toFloat(); setPadding(dp(10), 0, dp(10), 0)
        styleButton(this, color, false)
    }
    private fun styleButton(button: Button, color: Int, selected: Boolean) {
        button.background = GradientDrawable().apply {
            cornerRadius = dp(14).toFloat(); setColor(if (selected) 0xFF173248.toInt() else 0xFF0E1E2C.toInt())
            setStroke(dp(if (selected) 3 else 2), color)
        }
        button.alpha = if (selected) 1f else 0.72f
        button.elevation = dp(if (selected) 8 else 3).toFloat()
    }
    private fun askValue(title: String, current: Double, done: (Double) -> Unit) {
        val input = EditText(this).apply { setText(DisplayFormat.mm(current)); inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL }
        AlertDialog.Builder(this).setTitle(title).setView(input)
            .setPositiveButton("確定") { _, _ -> input.text.toString().toDoubleOrNull()?.takeIf { it > 0 }?.let(done) }
            .setNegativeButton("取消", null).show()
    }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).roundToInt()
}

class FlowLayout(context: Context) : ViewGroup(context) {
    private val gap = (6 * resources.displayMetrics.density).roundToInt()

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val available = MeasureSpec.getSize(widthMeasureSpec) - paddingLeft - paddingRight
        var x = 0; var y = 0; var rowH = 0
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            measureChild(child, widthMeasureSpec, heightMeasureSpec)
            if (x + child.measuredWidth > available && x > 0) { x = 0; y += rowH + gap; rowH = 0 }
            x += child.measuredWidth + gap
            rowH = max(rowH, child.measuredHeight)
        }
        y += rowH + paddingTop + paddingBottom
        setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), resolveSize(y, heightMeasureSpec))
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        val available = r - l - paddingLeft - paddingRight
        var x = paddingLeft; var y = paddingTop; var rowH = 0
        for (i in 0 until childCount) {
            val child = getChildAt(i)
            if (x - paddingLeft + child.measuredWidth > available && x > paddingLeft) { x = paddingLeft; y += rowH + gap; rowH = 0 }
            child.layout(x, y, x + child.measuredWidth, y + child.measuredHeight)
            x += child.measuredWidth + gap
            rowH = max(rowH, child.measuredHeight)
        }
    }
}

class CadView(context: Context) : View(context) {
    private val doc = DrawingDocument()
    private val history = History(doc)
    private val gridPaint = Paint(1).apply { color = 0xFF163044.toInt() }
    private val axisPaint = Paint(2).apply { color = 0xFF00B8D4.toInt() }
    private val geoPaint = Paint(3).apply { color = 0xFFE8F1FA.toInt(); style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val accentPaint = Paint(3).apply { color = 0xFFFFB020.toInt(); style = Paint.Style.STROKE }
    private val textPaint = Paint(1).apply { color = 0xFF8FB3C9.toInt(); textSize = 14 * resources.displayMetrics.scaledDensity; isDither = true }
    private val gridPath = Path()
    private val normalLinePath = Path()
    private val selectedLinePath = Path()
    private val arcPath = Path()
    private var tool = Tool.LINE
    private var firstPoint: Vec2? = null
    private val selectedLines = mutableListOf<String>()
    private val transform = WorldTransform(0.0, 0.0, 5.0)
    private var lastX = 0f; private var lastY = 0f
    private var lastWorld = Vec2(0.0, 0.0)
    var chamferValue = 5.0
    var filletValue = 5.0

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            transform.zoomAt(Vec2(detector.focusX.toDouble(), detector.focusY.toDouble()), detector.scaleFactor.toDouble())
            postInvalidateOnAnimation(); return true
        }
    })

    init {
        setBackgroundColor(0xFF081622.toInt())
        isFocusable = true
        setLayerType(View.LAYER_TYPE_HARDWARE, null)
        geoPaint.strokeJoin = Paint.Join.ROUND
        geoPaint.strokeCap = Paint.Cap.ROUND
        geoPaint.isDither = true
        accentPaint.strokeJoin = Paint.Join.ROUND
        accentPaint.strokeCap = Paint.Cap.ROUND
        accentPaint.isDither = true
    }

    fun setTool(t: Tool) { tool = t; firstPoint = null; selectedLines.clear(); invalidate() }
    fun undo() { history.undo(); firstPoint = null; selectedLines.clear(); invalidate() }
    fun redo() { history.redo(); firstPoint = null; selectedLines.clear(); invalidate() }
    fun aiInspect() {
        val result = AiCadInspector.inspect(doc.snapshot())
        val message = if (result.issues.isEmpty()) "未發現明顯幾何異常。CAM 前仍需人工確認刀具、座標與 Z 高度。"
        else result.issues.take(8).joinToString("\n") { "${it.severity}: ${it.message}" } +
            if (result.issues.size > 8) "\n…另有 ${result.issues.size - 8} 項" else ""
        AlertDialog.Builder(context)
            .setTitle("AI CAD 安全檢查")
            .setMessage(message)
            .setPositiveButton("知道了", null)
            .show()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        if (oldw == 0) { transform.originScreenX = w / 2.0; transform.originScreenY = h / 2.0 }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        drawGrid(canvas)
        drawEntities(canvas)
        firstPoint?.let { val p = transform.worldToScreen(it); canvas.drawCircle(p.x.toFloat(), p.y.toFloat(), 8f, accentPaint) }
        canvas.drawText("精度 0.001 mm • 顯示 0.000 • ${tool.name}   X ${DisplayFormat.mm(lastWorld.x)}  Y ${DisplayFormat.mm(lastWorld.y)}   C${DisplayFormat.mm(chamferValue)} R${DisplayFormat.mm(filletValue)}", 16f, 26f, textPaint)
    }

    private fun drawGrid(canvas: Canvas) {
        val step = (10.0 * transform.pixelsPerUnit).coerceAtLeast(20.0)
        gridPath.reset()
        var x = transform.originScreenX % step
        while (x < width) {
            gridPath.moveTo(x.toFloat(), 0f)
            gridPath.lineTo(x.toFloat(), height.toFloat())
            x += step
        }
        var y = transform.originScreenY % step
        while (y < height) {
            gridPath.moveTo(0f, y.toFloat())
            gridPath.lineTo(width.toFloat(), y.toFloat())
            y += step
        }
        canvas.drawPath(gridPath, gridPaint)
        canvas.drawLine(0f, transform.originScreenY.toFloat(), width.toFloat(), transform.originScreenY.toFloat(), axisPaint)
        canvas.drawLine(transform.originScreenX.toFloat(), 0f, transform.originScreenX.toFloat(), height.toFloat(), axisPaint)
        canvas.drawText("原點 X0.000 Y0.000", transform.originScreenX.toFloat()+8f, transform.originScreenY.toFloat()-8f, textPaint)
    }

    private fun drawEntities(canvas: Canvas) {
        normalLinePath.reset()
        selectedLinePath.reset()
        doc.all().forEach { e -> when (e) {
            is Line -> {
                val a = transform.worldToScreen(e.a); val b = transform.worldToScreen(e.b)
                val path = if (selectedLines.contains(e.id)) selectedLinePath else normalLinePath
                path.moveTo(a.x.toFloat(), a.y.toFloat())
                path.lineTo(b.x.toFloat(), b.y.toFloat())
            }
            is Circle -> {
                val p = transform.worldToScreen(e.center)
                geoPaint.color = 0xFFE8F1FA.toInt()
                canvas.drawCircle(p.x.toFloat(), p.y.toFloat(), (e.radius * transform.pixelsPerUnit).toFloat(), geoPaint)
            }
            is Arc -> {
                geoPaint.color = 0xFFE8F1FA.toInt()
                drawArcPolyline(canvas, e)
            }
        } }
        geoPaint.color = 0xFFE8F1FA.toInt()
        canvas.drawPath(normalLinePath, geoPaint)
        geoPaint.color = 0xFFFFB020.toInt()
        canvas.drawPath(selectedLinePath, geoPaint)
    }

    private fun drawArcPolyline(canvas: Canvas, arc: Arc) {
        val startA = atan2(arc.start.y - arc.center.y, arc.start.x - arc.center.x)
        val endA = atan2(arc.end.y - arc.center.y, arc.end.x - arc.center.x)
        var delta = endA - startA
        if (arc.clockwise) while (delta > 0) delta -= 2 * Math.PI else while (delta < 0) delta += 2 * Math.PI
        if (abs(delta) > Math.PI) delta += if (delta > 0) -2 * Math.PI else 2 * Math.PI
        arcPath.reset()
        for (i in 0..32) {
            val a = startA + delta * i / 32.0
            val p = transform.worldToScreen(Vec2(arc.center.x + cos(a) * arc.radius, arc.center.y + sin(a) * arc.radius))
            if (i == 0) arcPath.moveTo(p.x.toFloat(), p.y.toFloat()) else arcPath.lineTo(p.x.toFloat(), p.y.toFloat())
        }
        canvas.drawPath(arcPath, geoPaint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        scaleDetector.onTouchEvent(event)
        if (event.pointerCount > 1) return true
        lastWorld = transform.screenToWorld(Vec2(event.x.toDouble(), event.y.toDouble()))
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastX = event.x; lastY = event.y
                if (tool != Tool.PAN) handleTap(lastWorld)
                invalidate(); return true
            }
            MotionEvent.ACTION_MOVE -> if (tool == Tool.PAN) {
                transform.pan((event.x-lastX).toDouble(), (event.y-lastY).toDouble())
                lastX=event.x; lastY=event.y; postInvalidateOnAnimation(); return true
            }
        }
        return true
    }

    private fun handleTap(p: Vec2) {
        when (tool) {
            Tool.LINE -> twoPoint(p) { a,b ->
                if (a.distanceTo(b) >= CNC_RESOLUTION_MM) history.run(AddEntitiesCommand(listOf(Line(a=a,b=b))))
            }
            Tool.RECT -> twoPoint(p) { a,b ->
                if (abs(a.x - b.x) < CNC_RESOLUTION_MM || abs(a.y - b.y) < CNC_RESOLUTION_MM) return@twoPoint
                history.run(AddEntitiesCommand(listOf(
                    Line(a=a,b=Vec2(b.x,a.y)), Line(a=Vec2(b.x,a.y),b=b),
                    Line(a=b,b=Vec2(a.x,b.y)), Line(a=Vec2(a.x,b.y),b=a)
                )))
            }
            Tool.CIRCLE -> twoPoint(p) { a,b -> a.distanceTo(b).takeIf { it >= CNC_RESOLUTION_MM }?.let { history.run(AddEntitiesCommand(listOf(Circle(center=a,radius=it)))) } }
            Tool.DELETE -> nearest(p)?.let { history.run(DeleteEntityCommand(it.id)) }
            Tool.CHAMFER, Tool.FILLET -> selectTwoLines(p)
            Tool.PAN -> Unit
        }
    }

    private fun twoPoint(p: Vec2, done: (Vec2,Vec2)->Unit) {
        val a = firstPoint
        if (a == null) firstPoint = p else { done(a,p); firstPoint = null }
    }

    private fun nearest(p: Vec2): Entity? {
        val tolerance = 18.0 / transform.pixelsPerUnit
        return doc.all().mapNotNull { e -> when (e) {
            is Line -> Geometry.distancePointToSegment(p,e) to e
            is Circle -> abs(p.distanceTo(e.center)-e.radius) to e
            is Arc -> abs(p.distanceTo(e.center)-e.radius) to e
        }}.filter { it.first < tolerance }.minByOrNull { it.first }?.second
    }

    private fun selectTwoLines(p: Vec2) {
        val line = nearest(p) as? Line ?: return
        if (!selectedLines.contains(line.id)) selectedLines.add(line.id)
        if (selectedLines.size == 2) {
            try {
                val command = if (tool == Tool.CHAMFER)
                    chamferCommand(doc, selectedLines[0], selectedLines[1], chamferValue)
                else filletCommand(doc, selectedLines[0], selectedLines[1], filletValue)
                history.run(command)
            } catch (ex: Exception) {
                Toast.makeText(context, ex.message ?: "幾何運算失敗", Toast.LENGTH_SHORT).show()
            }
            selectedLines.clear()
        }
    }
}
