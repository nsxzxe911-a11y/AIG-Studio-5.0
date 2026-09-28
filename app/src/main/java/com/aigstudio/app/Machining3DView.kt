package com.aigstudio.app

import android.content.Context
import android.graphics.BitmapFactory
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
    private val result: Machining3DResult,
    private val machineMode: String? = null
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
    private var progressiveFrame: ProgressiveMachining3DFrame? = null

    private val machineVisual: android.graphics.Bitmap? = null
    private val machineVisualPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply { alpha = 118 }

    private val surfacePaint = Paint().apply {
        style = Paint.Style.FILL
        isAntiAlias = false
        isDither = true
    }
    private val surfaceSeamPaint = Paint().apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.15f * resources.displayMetrics.density
        isAntiAlias = false
        isDither = true
    }
    private val edgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 0.55f
        color = Color.argb(36, 160, 230, 255)
    }
    private val showMaterialMeshEdges = false
    private val rapidPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.35f * resources.displayMetrics.density
        strokeCap = Paint.Cap.ROUND
        color = Color.argb(58,255,70,220)
    }
    private val cutPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.9f * resources.displayMetrics.density
        strokeCap = Paint.Cap.ROUND
        color = Color.argb(108,63,255,157)
    }
    private val activePathGlowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 9f * resources.displayMetrics.density
        strokeCap = Paint.Cap.ROUND
        color = Color.argb(66,61,235,255)
    }
    private val activePathPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 4f * resources.displayMetrics.density
        strokeCap = Paint.Cap.ROUND
        color = StudioProductionTheme.selected
    }
    private val toolHaloPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 8f * resources.displayMetrics.density
        color = Color.argb(58,245,158,11)
    }
    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val machinePaint = Paint().apply {
        style = Paint.Style.FILL
        isAntiAlias = false
        isDither = true
    }
    private val machineEdgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 0.85f * resources.displayMetrics.density
    }
    private val toolPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3f * resources.displayMetrics.density
        color = Color.rgb(245, 158, 11)
    }
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(225, 240, 255)
        textSize = 12f * resources.displayMetrics.scaledDensity
    }
    private val trianglePath = Path()
    private val projectedBuffer = ArrayList<ScreenPoint>(8192)
    private val visibleTriangleBuffer = ArrayList<Int>(8192)
    private val fpsMeter = SurfaceFpsMeter(refreshHzProvider = { display?.refreshRate?.toDouble() ?: 60.0 })

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

    fun showProgressiveFrame(index: Int): ProgressiveMachining3DFrame {
        val frame = ProgressiveMachining3D.frame(result, index)
        progressiveFrame = frame
        postInvalidateOnAnimation()
        return frame
    }

    fun clearProgressiveFrame() {
        progressiveFrame = null
        postInvalidateOnAnimation()
    }

    fun progressiveRemovedCells(): Int =
        progressiveFrame?.removedCells ?: result.removal.depth.count { it < 0.0 }

    private fun toolAxisVector(length: Double, axisA: Double, axisB: Double): Vec3 {
        val a = Math.toRadians(axisA)
        val b = Math.toRadians(axisB)
        val y1 = -length * sin(a)
        val z1 = length * cos(a)
        return Vec3(z1 * sin(b), y1, z1 * cos(b))
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

    private fun machineColor(role: MachineComponentRole, moving: Boolean): Int = when(role) {
        MachineComponentRole.BASE, MachineComponentRole.COLUMN ->
            Color.argb(if(moving) 246 else 236, 56, 104, 138)
        MachineComponentRole.FIXTURE ->
            Color.argb(if(moving) 248 else 240, 112, 132, 150)
        MachineComponentRole.TABLE ->
            Color.argb(if(moving) 250 else 244, 82, 132, 184)
        MachineComponentRole.TRUNNION ->
            Color.argb(if(moving) 252 else 246, 126, 92, 208)
        MachineComponentRole.ROTARY_A ->
            Color.argb(250, 38, 210, 230)
        MachineComponentRole.ROTARY_B ->
            Color.argb(250, 236, 72, 192)
        MachineComponentRole.SPINDLE ->
            Color.argb(252, 188, 226, 255)
        MachineComponentRole.HOLDER ->
            Color.argb(250, 92, 186, 232)
        MachineComponentRole.TOOL ->
            Color.argb(255, 255, 194, 64)
    }

    private fun machineDepthShade(base: Int, depth: Double, minDepth: Double, maxDepth: Double): Int {
        val ratio = if(abs(maxDepth-minDepth) < 1e-9) 0.5 else
            ((depth-minDepth)/(maxDepth-minDepth)).coerceIn(0.0,1.0)
        val factor = 0.76 + ratio*0.30
        return Color.argb(
            Color.alpha(base),
            (Color.red(base)*factor).roundToInt().coerceIn(0,255),
            (Color.green(base)*factor).roundToInt().coerceIn(0,255),
            (Color.blue(base)*factor).roundToInt().coerceIn(0,255)
        )
    }

    private fun drawMachineModel(canvas: Canvas, model: MachineModel3D, scale: Double) {
        val prepared=model.components.map { component ->
            val pts=component.mesh.vertices.map { project(it,scale) }
            Triple(component,pts,pts.map { it.depth }.average())
        }.sortedBy { it.third }
        prepared.forEach { item ->
            val component=item.first
            val pts=item.second
            val ordered=component.mesh.triangles.map { tri ->
                val depth=(pts[tri.a].depth+pts[tri.b].depth+pts[tri.c].depth)/3.0
                depth to tri
            }.sortedBy { it.first }
            val baseColor=machineColor(component.role,component.moving)
            val minDepth=ordered.firstOrNull()?.first ?: 0.0
            val maxDepth=ordered.lastOrNull()?.first ?: minDepth
            machineEdgePaint.color=Color.argb(
                when(component.role){
                    MachineComponentRole.TOOL -> 255
                    MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 180
                    MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 128
                    MachineComponentRole.TRUNNION,MachineComponentRole.TABLE -> 96
                    else -> 72
                },
                174,240,255
            )
            machineEdgePaint.strokeWidth=when(component.role){
                MachineComponentRole.TOOL -> 1.9f*resources.displayMetrics.density
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 1.3f*resources.displayMetrics.density
                MachineComponentRole.ROTARY_A,MachineComponentRole.ROTARY_B -> 1.0f*resources.displayMetrics.density
                MachineComponentRole.TRUNNION,MachineComponentRole.TABLE -> 0.85f*resources.displayMetrics.density
                else -> 0.75f*resources.displayMetrics.density
            }
            val rotarySurfaceSolid=component.role==MachineComponentRole.ROTARY_A || component.role==MachineComponentRole.ROTARY_B
            val drawRoleEdges=when(component.role){
                MachineComponentRole.TOOL,
                MachineComponentRole.SPINDLE,
                MachineComponentRole.HOLDER -> true
                else -> false
            }
            val edgeStep=when(component.role){
                MachineComponentRole.TOOL -> 1
                MachineComponentRole.SPINDLE,MachineComponentRole.HOLDER -> 96
                else -> 1
            }
            if(rotarySurfaceSolid){
                val solidPath=Path()
                ordered.forEach { item ->
                    val tri=item.second
                    val a=pts[tri.a]; val b=pts[tri.b]; val c=pts[tri.c]
                    solidPath.moveTo(a.x,a.y)
                    solidPath.lineTo(b.x,b.y)
                    solidPath.lineTo(c.x,c.y)
                    solidPath.close()
                }
                machinePaint.color=baseColor
                canvas.drawPath(solidPath,machinePaint)
            } else {
                ordered.forEachIndexed { index,item ->
                    val tri=item.second
                    machinePaint.color=machineDepthShade(baseColor,item.first,minDepth,maxDepth)
                    val a=pts[tri.a]; val b=pts[tri.b]; val c=pts[tri.c]
                    trianglePath.reset()
                    trianglePath.moveTo(a.x,a.y)
                    trianglePath.lineTo(b.x,b.y)
                    trianglePath.lineTo(c.x,c.y)
                    trianglePath.close()
                    canvas.drawPath(trianglePath,machinePaint)
                    if(drawRoleEdges && index%edgeStep==0){ canvas.drawPath(trianglePath,machineEdgePaint) }
                }
            }
        }
    }

    private fun drawToolStackForeground(canvas:Canvas,model:MachineModel3D,scale:Double) {
        model.components.forEach { component ->
            val edgeStep=when(component.role){
                MachineComponentRole.TOOL -> 1
                MachineComponentRole.HOLDER -> 48
                MachineComponentRole.SPINDLE -> 72
                else -> return@forEach
            }
            machineEdgePaint.color=when(component.role){
                MachineComponentRole.TOOL -> Color.argb(255,255,196,64)
                MachineComponentRole.HOLDER -> Color.argb(236,92,186,232)
                else -> Color.argb(232,188,226,255)
            }
            machineEdgePaint.strokeWidth=when(component.role){
                MachineComponentRole.TOOL -> 2.4f*resources.displayMetrics.density
                MachineComponentRole.HOLDER -> 1.7f*resources.displayMetrics.density
                else -> 1.5f*resources.displayMetrics.density
            }
            val pts=component.mesh.vertices.map { project(it,scale) }
            component.mesh.triangles.forEachIndexed { index,tri ->
                if(index%edgeStep==0){
                    val a=pts[tri.a]; val b=pts[tri.b]; val c=pts[tri.c]
                    trianglePath.reset()
                    trianglePath.moveTo(a.x,a.y)
                    trianglePath.lineTo(b.x,b.y)
                    trianglePath.lineTo(c.x,c.y)
                    trianglePath.close()
                    canvas.drawPath(trianglePath,machineEdgePaint)
                }
            }
        }
    }

    private fun machineSpace(v:Vec3,mode:String,live:Move?):Vec3 {
        val a=if(mode=="3AX")0.0 else live?.axisA ?: 0.0
        val b=if(mode=="5AX")live?.axisB ?: 0.0 else 0.0
        return MachineKinematics3D.transform(v,a,b)
    }

    private fun dynamicTriangleBudget(currentFps: Double): Int {
        val target = (display?.refreshRate ?: 60f).coerceIn(30f, 120f).toDouble()
        val base = if (target >= 90.0) 4600 else 5500
        val ratio = if (currentFps <= 1.0) 1.0 else currentFps / target
        val scale = when {
            ratio < 0.55 -> 0.55
            ratio < 0.72 -> 0.68
            ratio < 0.86 -> 0.82
            else -> 1.0
        }
        return (base * scale).roundToInt().coerceAtLeast(700)
    }

    private fun triangleVisible(a: ScreenPoint, b: ScreenPoint, c: ScreenPoint): Boolean {
        val margin = 36f * resources.displayMetrics.density
        val minX = min(a.x, min(b.x, c.x))
        val maxX = max(a.x, max(b.x, c.x))
        val minY = min(a.y, min(b.y, c.y))
        val maxY = max(a.y, max(b.y, c.y))
        return maxX >= -margin && minX <= width + margin &&
            maxY >= -margin && minY <= height + margin
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (width <= 0 || height <= 0) return
        machineVisual?.let { bitmap ->
            val srcRatio=bitmap.width.toFloat()/bitmap.height.toFloat()
            val dstRatio=width.toFloat()/height.toFloat()
            val dw=if(srcRatio>dstRatio) height*srcRatio else width.toFloat()
            val dh=if(srcRatio>dstRatio) height.toFloat() else width/srcRatio
            val dst=android.graphics.RectF((width-dw)/2f,(height-dh)/2f,(width+dw)/2f,(height+dh)/2f)
            canvas.drawBitmap(bitmap,null,dst,machineVisualPaint)
            canvas.drawColor(Color.argb(52,2,7,14))
        }
        val fpsStats = fpsMeter.record(System.nanoTime())

        val stockW = result.stock.maxX - result.stock.minX
        val stockH = result.stock.maxY - result.stock.minY
        val span = max(max(stockW, stockH), result.stock.thickness).coerceAtLeast(1.0)
        val scale = min(width, height) * 0.48 / span * zoom

        val activeFrame = progressiveFrame
        val liveMove = activeFrame?.toolPoint ?: result.cam.toolpaths.lastOrNull()?.moves?.lastOrNull()
        val resolvedMode=(machineMode ?: when {
            abs(liveMove?.axisB ?: 0.0)>1e-9 -> "5AX"
            abs(liveMove?.axisA ?: 0.0)>1e-9 -> "4AX"
            else -> "3AX"
        }).uppercase()
        val machineModel=MachineModel3DBuilder.build(
            result,
            resolvedMode,
            liveMove?.axisA,
            liveMove?.axisB,
            liveMove
        )
        drawMachineModel(canvas,machineModel,scale)
        val activeMesh = activeFrame?.mesh ?: result.mesh
        projectedBuffer.clear()
        activeMesh.vertices.forEach { projectedBuffer.add(project(machineSpace(it,resolvedMode,liveMove), scale)) }
        val projected = projectedBuffer
        val triangles = activeMesh.triangles
        val budget = dynamicTriangleBudget(fpsStats.fps)
        val stride = max(1, ceil(triangles.size / budget.toDouble()).toInt())
        visibleTriangleBuffer.clear()
        var triangleIndex = 0
        while (triangleIndex < triangles.size) {
            val triangle = triangles[triangleIndex]
            val a = projected[triangle.a]
            val b = projected[triangle.b]
            val c = projected[triangle.c]
            if (triangleVisible(a,b,c)) visibleTriangleBuffer.add(triangleIndex)
            triangleIndex += stride
        }
        visibleTriangleBuffer.sortBy { index ->
            val triangle = triangles[index]
            (projected[triangle.a].depth + projected[triangle.b].depth + projected[triangle.c].depth) / 3.0
        }

        surfacePaint.color=Color.rgb(45,145,220)
        surfaceSeamPaint.color=surfacePaint.color
        visibleTriangleBuffer.forEachIndexed { visibleIndex,index ->
            val triangle=triangles[index]
            val a=projected[triangle.a]; val b=projected[triangle.b]; val c=projected[triangle.c]
            trianglePath.reset(); trianglePath.moveTo(a.x,a.y); trianglePath.lineTo(b.x,b.y); trianglePath.lineTo(c.x,c.y); trianglePath.close()
            canvas.drawPath(trianglePath,surfacePaint)
            canvas.drawPath(trianglePath,surfaceSeamPaint)
            if(showMaterialMeshEdges && visibleIndex % 18 == 0) { canvas.drawPath(trianglePath,edgePaint) }
        }
        drawToolStackForeground(canvas,machineModel,scale)

        var remainingMoves = activeFrame?.index?.plus(1) ?: Int.MAX_VALUE
        result.cam.toolpaths.forEach { toolpath ->
            if (remainingMoves <= 0) return@forEach
            var previous: Move? = null
            val takeCount = min(remainingMoves, toolpath.moves.size)
            toolpath.moves.take(takeCount).forEach { move ->
                val prev = previous
                if (prev != null) {
                    val a = project(machineSpace(Vec3(prev.to.x, prev.to.y, prev.z),resolvedMode,liveMove), scale)
                    val b = project(machineSpace(Vec3(move.to.x, move.to.y, move.z),resolvedMode,liveMove), scale)
                    canvas.drawLine(a.x, a.y, b.x, b.y, if (move.rapid) rapidPaint else cutPaint)
                }
                previous = move
            }
            if (activeFrame != null) remainingMoves -= takeCount
        }
        activeFrame?.let { frame ->
            val flatMoves=result.cam.toolpaths.flatMap{it.moves}
            val i=frame.index.coerceIn(1,(flatMoves.size-1).coerceAtLeast(1))
            if(flatMoves.size>1){
                val prev=flatMoves[i-1]
                val move=flatMoves[i]
                val a=project(machineSpace(Vec3(prev.to.x,prev.to.y,prev.z),resolvedMode,liveMove),scale)
                val b=project(machineSpace(Vec3(move.to.x,move.to.y,move.z),resolvedMode,liveMove),scale)
                canvas.drawLine(a.x,a.y,b.x,b.y,activePathGlowPaint)
                canvas.drawLine(a.x,a.y,b.x,b.y,activePathPaint)
                canvas.drawCircle(b.x,b.y,5f*resources.displayMetrics.density,activePathPaint)
            }
        }

        if (liveMove != null) {
            val machineTip=machineSpace(Vec3(liveMove.to.x, liveMove.to.y, liveMove.z),resolvedMode,liveMove)
            val tip = project(machineTip, scale)
            val toolLength = max(12.0, result.cam.settings.toolDiameter * 2.0)
            val top = project(Vec3(machineTip.x,machineTip.y,machineTip.z+toolLength),scale)
            val radius = max(4f, (result.cam.settings.toolDiameter * scale * 0.12).toFloat())
            canvas.drawCircle(tip.x,tip.y,radius+4f*resources.displayMetrics.density,toolHaloPaint)
            canvas.drawLine(tip.x, tip.y, top.x, top.y, toolPaint)
            canvas.drawCircle(tip.x, tip.y, radius, toolPaint)
        }

        activeFrame?.let { frame ->
            val progress=frame.progress.toFloat().coerceIn(0f,1f)
            val left=12f*resources.displayMetrics.density
            val right=width-12f*resources.displayMetrics.density
            val bottom=height-10f*resources.displayMetrics.density
            val top=bottom-6f*resources.displayMetrics.density
            progressPaint.color=Color.argb(155,8,20,32)
            canvas.drawRoundRect(left,top,right,bottom,3f*resources.displayMetrics.density,3f*resources.displayMetrics.density,progressPaint)
            progressPaint.color=StudioProductionTheme.selected
            canvas.drawRoundRect(left,top,left+(right-left)*progress,bottom,3f*resources.displayMetrics.density,3f*resources.displayMetrics.density,progressPaint)
        }

        val removed = activeFrame?.removedCells ?: result.removal.depth.count { it < 0.0 }
        val modelScenario = RenderStressClassifier.modelScenario(triangles.size)
        RenderStressProfiler.record(modelScenario, fpsStats)
        if (removed > 0) RenderStressProfiler.record(RenderStressScenario.MATERIAL_REMOVAL, fpsStats)
        val worst = RenderStressProfiler.heaviest()?.scenario?.name ?: "collecting"
        val label = "TRUE 3D • MACHINE=" + machineModel.mode +
            " • PARTS=" + machineModel.components.size +
            " • CAM=" + result.cam.toolpaths.size +
            " • removed=" + removed +
            (activeFrame?.let { " • frame=" + (it.index + 1) + "/" + it.total +
                " • " + String.format(java.util.Locale.US, "%.1f", it.progress * 100.0) + "%" } ?: "") +
            " • SPACE=MACHINE • tier=" + modelScenario.name +
            " • 原點 X0.000 Y0.000 • 精度 0.001 mm" +
            " • " + fpsStats.compact("3D") +
            " • HEAVIEST=" + worst
        canvas.drawText(label, 14f, 24f, textPaint)
    }
}
