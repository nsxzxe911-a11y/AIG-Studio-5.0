package com.aigstudio.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.text.InputType
import android.view.Gravity
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Toast
import com.aigstudio.core.*
import kotlin.math.*

/**
 * CAD-only assist layer. It reads the real DrawingSnapshot and never owns CAD,
 * CAM or machine geometry. Exact numeric creation is routed back through the
 * existing CadView History/Command path so Undo/Redo and stale callbacks remain authoritative.
 */
object CadAssistOverlayInstaller {
    private const val INSTALL_TAG="AIG_CAD_EXACT_3D_ASSIST_V1"

    fun install(activity:Activity) {
        val decor=activity.window.decorView
        decor.post {
            val cad=findCadView(decor) ?: return@post
            val stage=cad.parent as? FrameLayout ?: return@post
            if(stage.findViewWithTag<View>(INSTALL_TAG)!=null) return@post

            val preview=CadAssist3DView(activity,cad).apply {
                visibility=View.GONE
                contentDescription="CAD 3D 360 AUXILIARY VIEW • VIEW ONLY • NO CAM RECALC"
            }
            stage.addView(
                preview,
                1.coerceAtMost(stage.childCount),
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            )

            val rail=LinearLayout(activity).apply {
                tag=INSTALL_TAG
                orientation=LinearLayout.VERTICAL
                gravity=Gravity.END
                setPadding(dp(activity,4),dp(activity,4),dp(activity,4),dp(activity,4))
                contentDescription="CAD ASSIST QUICK SWITCH"
            }
            lateinit var viewButton:RgbGlowButton
            lateinit var cameraButton:RgbGlowButton

            viewButton=assistButton(activity,"3D 輔看",0xFF27E9FF.toInt()) {
                val opening=preview.visibility!=View.VISIBLE
                preview.visibility=if(opening) View.VISIBLE else View.GONE
                cameraButton.visibility=if(opening) View.VISIBLE else View.GONE
                viewButton.text=if(opening) "返回 2D" else "3D 輔看"
                if(opening) {
                    preview.syncNow()
                    Toast.makeText(
                        activity,
                        "CAD 3D 輔看 • VIEW ONLY • 拖曳 360° • 雙指縮放 • 不重算 CAM",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
            cameraButton=assistButton(activity,"視角",0xFF8B5CF6.toInt()) {
                showCameraMenu(activity,preview)
            }.apply { visibility=View.GONE }
            val numericButton=assistButton(activity,"數值",0xFF63FF9D.toInt()) {
                showExactMenu(activity,cad,preview)
            }
            rail.addView(viewButton)
            rail.addView(cameraButton)
            rail.addView(numericButton)
            stage.addView(
                rail,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.TOP or Gravity.END
                ).apply { setMargins(dp(activity,4),dp(activity,8),dp(activity,8),0) }
            )
        }
    }

    private fun findCadView(view:View):CadView? {
        if(view is CadView) return view
        if(view is ViewGroup) {
            for(i in 0 until view.childCount) findCadView(view.getChildAt(i))?.let{return it}
        }
        return null
    }

    private fun assistButton(activity:Activity,label:String,color:Int,action:()->Unit)=
        RgbGlowButton(activity).apply {
            text=label
            minHeight=dp(activity,42)
            minWidth=dp(activity,86)
            textSize=10f
            maxLines=1
            setRgbState(color,false)
            setOnClickListener { action() }
        }

    private fun showCameraMenu(activity:Activity,preview:CadAssist3DView) {
        val presets=CadAssistViewContract.presets.toTypedArray()
        AlertDialog.Builder(activity)
            .setTitle("CAD 3D 輔看 • 視角")
            .setItems(presets) { dialog,which ->
                preview.preset(presets[which])
                dialog.dismiss()
            }
            .setNegativeButton("關閉",null)
            .show()
    }

    private fun showExactMenu(activity:Activity,cad:CadView,preview:CadAssist3DView) {
        val labels=arrayOf(
            "LINE • X1 Y1 → X2 Y2",
            "LINE • X Y + 長度 + 角度",
            "RECT • X Y + W H",
            "CIRCLE • 中心 X Y + R",
            "CIRCLE • 中心 X Y + Ø",
            "ARC CCW • 中心 + R + 起/終角",
            "ARC CW • 中心 + R + 起/終角",
            "HOLE • 中心 X Y + Ø",
            "尺寸驅動 • 選取幾何",
            "移動 / 複製 • ΔX ΔY",
            "旋轉 / OFFSET / ARRAY"
        )
        AlertDialog.Builder(activity)
            .setTitle("CAD 精確數值 • 0.001 mm")
            .setItems(labels) { dialog,which ->
                dialog.dismiss()
                when(which) {
                    0 -> exactFields(activity,"LINE • 端點",
                        listOf("X1" to "0.000","Y1" to "0.000","X2" to "10.000","Y2" to "0.000")) { v ->
                        applyExact(activity,cad,preview,CadExactInputEngine.lineEndpoints(v[0],v[1],v[2],v[3]))
                    }
                    1 -> exactFields(activity,"LINE • 長度 / 角度",
                        listOf("X" to "0.000","Y" to "0.000","L mm" to "10.000","角度 °" to "0.000")) { v ->
                        applyExact(activity,cad,preview,CadExactInputEngine.linePolar(v[0],v[1],v[2],v[3]))
                    }
                    2 -> exactFields(activity,"RECT • 原點 / W / H",
                        listOf("X" to "0.000","Y" to "0.000","W mm" to "20.000","H mm" to "10.000")) { v ->
                        applyExact(activity,cad,preview,CadExactInputEngine.rectangle(v[0],v[1],v[2],v[3]))
                    }
                    3 -> exactFields(activity,"CIRCLE • R",
                        listOf("中心 X" to "0.000","中心 Y" to "0.000","R mm" to "5.000")) { v ->
                        applyExact(activity,cad,preview,CadExactInputEngine.circleRadius(v[0],v[1],v[2]))
                    }
                    4 -> exactFields(activity,"CIRCLE • Ø",
                        listOf("中心 X" to "0.000","中心 Y" to "0.000","Ø mm" to "10.000")) { v ->
                        applyExact(activity,cad,preview,CadExactInputEngine.circleDiameter(v[0],v[1],v[2]))
                    }
                    5 -> showArcFields(activity,cad,preview,false)
                    6 -> showArcFields(activity,cad,preview,true)
                    7 -> exactFields(activity,"HOLE • Ø",
                        listOf("中心 X" to "0.000","中心 Y" to "0.000","Ø mm" to "6.000")) { v ->
                        applyExact(activity,cad,preview,CadExactInputEngine.holeDiameter(v[0],v[1],v[2]))
                    }
                    8 -> cad.promptDrivenDimension()
                    9 -> showMoveCopyMenu(activity,cad)
                    10 -> showModifyMenu(activity,cad)
                }
            }
            .setNegativeButton("關閉",null)
            .show()
    }

    private fun showArcFields(activity:Activity,cad:CadView,preview:CadAssist3DView,clockwise:Boolean) {
        exactFields(
            activity,
            "ARC ${if(clockwise)"CW" else "CCW"} • 中心/R/角度",
            listOf(
                "中心 X" to "0.000","中心 Y" to "0.000","R mm" to "5.000",
                "起始角 °" to "0.000","終止角 °" to "90.000"
            )
        ) { v ->
            applyExact(
                activity,cad,preview,
                CadExactInputEngine.arcDegrees(v[0],v[1],v[2],v[3],v[4],clockwise)
            )
        }
    }

    private fun showMoveCopyMenu(activity:Activity,cad:CadView) {
        AlertDialog.Builder(activity)
            .setTitle("CAD • 移動 / 複製")
            .setItems(arrayOf("移動 ΔX / ΔY","複製 ΔX / ΔY")) { d,w ->
                d.dismiss()
                cad.promptMoveCopy(copy=w==1)
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun showModifyMenu(activity:Activity,cad:CadView) {
        AlertDialog.Builder(activity)
            .setTitle("CAD • 精確修改")
            .setItems(arrayOf("旋轉角度","OFFSET mm","ARRAY 數量 / ΔX / ΔY")) { d,w ->
                d.dismiss()
                when(w) { 0->cad.promptRotate(); 1->cad.promptOffset(); 2->cad.promptArray() }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun exactFields(
        activity:Activity,
        title:String,
        specs:List<Pair<String,String>>,
        apply:(List<Double>)->Unit
    ) {
        val box=LinearLayout(activity).apply {
            orientation=LinearLayout.VERTICAL
            setPadding(dp(activity,18),dp(activity,8),dp(activity,18),dp(activity,4))
        }
        val fields=specs.map { (label,initial) ->
            EditText(activity).apply {
                hint=label
                setText(initial)
                inputType=InputType.TYPE_CLASS_NUMBER or
                    InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED
                setSingleLine(true)
                box.addView(this)
            }
        }
        AlertDialog.Builder(activity)
            .setTitle(title)
            .setMessage("Master X0.000 Y0.000 • 最小 0.001 mm • 套用後可 Undo/Redo")
            .setView(box)
            .setPositiveButton("套用") { _,_ ->
                val values=fields.map { it.text.toString().trim().toDoubleOrNull() }
                if(values.any{it==null}) {
                    showWarning(activity,"數值格式錯誤；CAD 保持原狀。")
                } else runCatching { apply(values.map{it!!}) }
                    .onFailure { showWarning(activity,it.message ?: "CAD exact input blocked") }
            }
            .setNegativeButton("取消",null)
            .show()
    }

    private fun applyExact(
        activity:Activity,
        cad:CadView,
        preview:CadAssist3DView,
        primitives:List<CadExactPrimitive>
    ) {
        runCatching {
            val entities=toEntities(primitives)
            require(entities.isNotEmpty()) { "No CAD geometry generated" }
            val method=cad.javaClass.getDeclaredMethod("runGeometryCommand",Command::class.java)
            method.isAccessible=true
            method.invoke(cad,AddEntitiesCommand(entities))
            preview.syncNow()
            entities.size
        }.onSuccess { count ->
            Toast.makeText(
                activity,
                "CAD EXACT PASS • $count geometry • 0.001 mm • Undo/Redo READY",
                Toast.LENGTH_SHORT
            ).show()
        }.onFailure { error ->
            val root=error.cause ?: error
            showWarning(activity,root.message ?: "CAD exact input blocked")
        }
    }

    private fun toEntities(primitives:List<CadExactPrimitive>):List<Entity> {
        val rectangle=primitives.size==4 && primitives.all{it is CadExactLine && it.rectangleEdge}
        val rectIds=if(rectangle) CadSemanticIdentity.newRectIds() else emptyList()
        var lineIndex=0
        return primitives.map { p -> when(p) {
            is CadExactLine -> {
                val id=if(rectangle) rectIds[lineIndex++] else null
                if(id==null) Line(a=p.a.vec(),b=p.b.vec()) else Line(id=id,a=p.a.vec(),b=p.b.vec())
            }
            is CadExactCircle -> if(p.hole)
                Circle(id=CadSemanticIdentity.newHoleId(),center=p.center.vec(),radius=p.radius)
            else Circle(center=p.center.vec(),radius=p.radius)
            is CadExactArc -> Arc(
                center=p.center.vec(),radius=p.radius,start=p.start.vec(),end=p.end.vec(),clockwise=p.clockwise
            )
        } }
    }

    private fun CadExactPoint.vec()=Vec2(x,y)

    private fun showWarning(activity:Activity,message:String) {
        runCatching {
            AlertDialog.Builder(activity)
                .setTitle("CAD 訊息")
                .setMessage("WARNING • $message\n\n目前資料保留；不回退版本、不切工程殼。")
                .setPositiveButton("知道了",null)
                .show()
        }.onFailure { Toast.makeText(activity,"CAD WARNING • $message",Toast.LENGTH_LONG).show() }
    }

    private fun dp(context:Context,value:Int)=
        (value*context.resources.displayMetrics.density).roundToInt()
}

class CadAssist3DView(
    context:Context,
    private val cad:CadView
):View(context) {
    private val geometryPaint=Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color=0xFFE8F1FA.toInt();style=Paint.Style.STROKE
        strokeWidth=2.0f*resources.displayMetrics.density
        strokeCap=Paint.Cap.ROUND;strokeJoin=Paint.Join.ROUND
    }
    private val selectedPaint=Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color=0xFFFFB020.toInt();style=Paint.Style.STROKE
        strokeWidth=3.2f*resources.displayMetrics.density
        strokeCap=Paint.Cap.ROUND;strokeJoin=Paint.Join.ROUND
    }
    private val ghostPaint=Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color=0x553DEBFF;style=Paint.Style.STROKE
        strokeWidth=1.2f*resources.displayMetrics.density
    }
    private val axisPaint=Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color=0xFF63FF9D.toInt();style=Paint.Style.STROKE
        strokeWidth=2f*resources.displayMetrics.density
    }
    private val textPaint=Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color=0xFFD7EDFF.toInt();textSize=11f*resources.displayMetrics.scaledDensity
    }
    private val path=Path()
    private var yaw=-45.0
    private var pitch=35.264
    private var zoom=1.0
    private var lastX=0f
    private var lastY=0f
    private val scaleDetector=ScaleGestureDetector(context,object:ScaleGestureDetector.SimpleOnScaleGestureListener(){
        override fun onScale(detector:ScaleGestureDetector):Boolean {
            zoom=(zoom*detector.scaleFactor.toDouble()).coerceIn(0.15,12.0)
            postInvalidateOnAnimation()
            return true
        }
    })

    init {
        setBackgroundColor(0xFF050B12.toInt())
        isClickable=true
        isFocusable=true
    }

    fun syncNow() { invalidate() }

    fun preset(id:String) {
        when(id.uppercase()) {
            "TOP" -> { yaw=0.0;pitch=0.0 }
            "FRONT" -> { yaw=0.0;pitch=90.0 }
            "RIGHT" -> { yaw=90.0;pitch=90.0 }
            "ISO" -> { yaw=-45.0;pitch=35.264 }
            "FIT" -> zoom=1.0
            "RESET" -> { yaw=-45.0;pitch=35.264;zoom=1.0 }
            else -> return
        }
        postInvalidateOnAnimation()
    }

    override fun onDraw(canvas:Canvas) {
        super.onDraw(canvas)
        val snapshot=cad.snapshot()
        val entities=snapshot.entities
        if(width<=0 || height<=0) return
        if(entities.isEmpty()) {
            textPaint.textAlign=Paint.Align.CENTER
            canvas.drawText("CAD 3D 輔看 • 目前無幾何",width/2f,height/2f,textPaint)
            textPaint.textAlign=Paint.Align.LEFT
            return
        }
        val bounds=bounds(entities)
        val cx=(bounds[0]+bounds[2])/2.0
        val cy=(bounds[1]+bounds[3])/2.0
        val span=max(bounds[2]-bounds[0],bounds[3]-bounds[1]).coerceAtLeast(1.0)
        val fitScale=min(width,height)*0.70/span*zoom
        val selected=selectedIdsReadOnly()
        val displayThickness=(span*0.035).coerceIn(0.25,5.0)

        fun project(x:Double,y:Double,z:Double):Pair<Float,Float> {
            val px=x-cx
            val py=y-cy
            val rz=Math.toRadians(yaw)
            val rp=Math.toRadians(pitch)
            val xr=px*cos(rz)-py*sin(rz)
            val yr=px*sin(rz)+py*cos(rz)
            val ys=yr*cos(rp)-z*sin(rp)
            return Pair(
                (width/2.0+xr*fitScale).toFloat(),
                (height/2.0-ys*fitScale).toFloat()
            )
        }

        drawReferencePlate(canvas,bounds,-displayThickness,::project)
        entities.forEach { entity ->
            val paint=if(entity.id in selected) selectedPaint else geometryPaint
            drawEntity(canvas,entity,0.0,paint,::project)
        }
        drawAxes(canvas,span,::project)

        canvas.drawText(
            "CAD 3D 輔看 • VIEW ONLY • YAW ${format(yaw)}° • PITCH ${format(pitch)}° • Z=CAD PLANE",
            14f*resources.displayMetrics.density,22f*resources.displayMetrics.density,textPaint
        )
        canvas.drawText(
            "拖曳=360°環繞 • 雙指=縮放 • DISPLAY THICKNESS ONLY • CAD/CAM/NC 不變",
            14f*resources.displayMetrics.density,42f*resources.displayMetrics.density,textPaint
        )
    }

    private fun bounds(entities:List<Entity>):DoubleArray {
        var minX=Double.POSITIVE_INFINITY;var minY=Double.POSITIVE_INFINITY
        var maxX=Double.NEGATIVE_INFINITY;var maxY=Double.NEGATIVE_INFINITY
        fun include(x:Double,y:Double){minX=min(minX,x);minY=min(minY,y);maxX=max(maxX,x);maxY=max(maxY,y)}
        entities.forEach { e -> when(e) {
            is Line -> { include(e.a.x,e.a.y);include(e.b.x,e.b.y) }
            is Circle -> { include(e.center.x-e.radius,e.center.y-e.radius);include(e.center.x+e.radius,e.center.y+e.radius) }
            is Arc -> { include(e.center.x-e.radius,e.center.y-e.radius);include(e.center.x+e.radius,e.center.y+e.radius) }
        } }
        return doubleArrayOf(minX,minY,maxX,maxY)
    }

    private fun drawReferencePlate(
        canvas:Canvas,b:DoubleArray,z:Double,
        project:(Double,Double,Double)->Pair<Float,Float>
    ) {
        val p=listOf(
            project(b[0],b[1],z),project(b[2],b[1],z),
            project(b[2],b[3],z),project(b[0],b[3],z)
        )
        path.reset()
        path.moveTo(p[0].first,p[0].second)
        for(i in 1..3) path.lineTo(p[i].first,p[i].second)
        path.close()
        canvas.drawPath(path,ghostPaint)
        val top=listOf(
            project(b[0],b[1],0.0),project(b[2],b[1],0.0),
            project(b[2],b[3],0.0),project(b[0],b[3],0.0)
        )
        for(i in 0..3) canvas.drawLine(p[i].first,p[i].second,top[i].first,top[i].second,ghostPaint)
    }

    private fun drawEntity(
        canvas:Canvas,e:Entity,z:Double,paint:Paint,
        project:(Double,Double,Double)->Pair<Float,Float>
    ) {
        when(e) {
            is Line -> {
                val a=project(e.a.x,e.a.y,z);val b=project(e.b.x,e.b.y,z)
                canvas.drawLine(a.first,a.second,b.first,b.second,paint)
            }
            is Circle -> drawCurve(canvas,paint,0..72) { i ->
                val a=2.0*Math.PI*i/72.0
                project(e.center.x+cos(a)*e.radius,e.center.y+sin(a)*e.radius,z)
            }
            is Arc -> {
                val start=atan2(e.start.y-e.center.y,e.start.x-e.center.x)
                val end=atan2(e.end.y-e.center.y,e.end.x-e.center.x)
                var delta=end-start
                if(e.clockwise) while(delta>0) delta-=2*Math.PI else while(delta<0) delta+=2*Math.PI
                if(abs(delta)>Math.PI) delta+=if(delta>0)-2*Math.PI else 2*Math.PI
                drawCurve(canvas,paint,0..48) { i ->
                    val a=start+delta*i/48.0
                    project(e.center.x+cos(a)*e.radius,e.center.y+sin(a)*e.radius,z)
                }
            }
        }
    }

    private inline fun drawCurve(
        canvas:Canvas,paint:Paint,steps:IntRange,
        point:(Int)->Pair<Float,Float>
    ) {
        path.reset()
        steps.forEachIndexed { index,i ->
            val p=point(i)
            if(index==0) path.moveTo(p.first,p.second) else path.lineTo(p.first,p.second)
        }
        canvas.drawPath(path,paint)
    }

    private fun drawAxes(
        canvas:Canvas,span:Double,
        project:(Double,Double,Double)->Pair<Float,Float>
    ) {
        val length=(span*0.22).coerceAtLeast(5.0)
        val o=project(0.0,0.0,0.0)
        listOf(
            "X" to project(length,0.0,0.0),
            "Y" to project(0.0,length,0.0),
            "Z" to project(0.0,0.0,length)
        ).forEach { (label,p) ->
            canvas.drawLine(o.first,o.second,p.first,p.second,axisPaint)
            canvas.drawText(label,p.first+4f,p.second-4f,textPaint)
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun selectedIdsReadOnly():Set<String> = runCatching {
        val field=cad.javaClass.getDeclaredField("selectedIds")
        field.isAccessible=true
        (field.get(cad) as? Set<String>)?.toSet().orEmpty()
    }.getOrDefault(emptySet())

    override fun onTouchEvent(event:MotionEvent):Boolean {
        scaleDetector.onTouchEvent(event)
        if(event.pointerCount>1) return true
        when(event.actionMasked) {
            MotionEvent.ACTION_DOWN -> { lastX=event.x;lastY=event.y;return true }
            MotionEvent.ACTION_MOVE -> {
                val dx=event.x-lastX;val dy=event.y-lastY
                yaw=(yaw+dx*0.45)%360.0
                pitch=(pitch-dy*0.35).coerceIn(-85.0,85.0)
                lastX=event.x;lastY=event.y
                postInvalidateOnAnimation()
                return true
            }
            MotionEvent.ACTION_UP -> { performClick();return true }
        }
        return true
    }

    override fun performClick():Boolean {
        super.performClick()
        return true
    }

    private fun format(v:Double)=String.format(java.util.Locale.US,"%.1f",v)
}

private fun dp(context:Context,value:Int)=
    (value*context.resources.displayMetrics.density).roundToInt()
