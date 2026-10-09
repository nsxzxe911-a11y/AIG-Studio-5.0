package com.aigstudio.production

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.drawable.GradientDrawable
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.GridLayout
import android.widget.LinearLayout
import com.aigstudio.production.runtime.CleanCadPrimitive
import com.aigstudio.production.runtime.CleanCadSession
import com.aigstudio.production.runtime.CleanCadSnapMode
import kotlin.math.hypot
import kotlin.math.min

class CleanCadPanel(context:Context, private val session:CleanCadSession, private val onStatus:(String)->Unit):LinearLayout(context) {
    private enum class Tool { LINE, RECT, CIRCLE, HOLE, SELECT }
    private val canvasView=CadCanvas(context)
    private lateinit var snapButton:Button
    private var snapMode:CleanCadSnapMode?=null
    private val snapModes=listOf(CleanCadSnapMode.ENDPOINT,CleanCadSnapMode.MIDPOINT,CleanCadSnapMode.CENTER,CleanCadSnapMode.INTERSECTION,CleanCadSnapMode.HORIZONTAL,CleanCadSnapMode.VERTICAL,CleanCadSnapMode.TANGENT)

    init {
        orientation=VERTICAL
        setPadding(dp(4),dp(4),dp(4),dp(4))
        background=GradientDrawable().apply { setColor(0xD0020407.toInt()); setStroke(dp(1),Color.rgb(61,235,255)); cornerRadius=dp(10).toFloat() }
        val tools=GridLayout(context).apply { columnCount=5 }
        fun toolButton(label:String,desc:String,action:()->Unit):Button {
            val button=Button(context).apply {
                text=label; contentDescription=desc; isAllCaps=false; textSize=8f; setTextColor(Color.WHITE)
                background=GradientDrawable().apply { setColor(0xCC07111B.toInt()); setStroke(dp(1),Color.rgb(61,235,255)); cornerRadius=dp(8).toFloat() }
                setOnClickListener { action() }
            }
            tools.addView(button,GridLayout.LayoutParams().apply { width=0; height=dp(40); columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f); setMargins(dp(2),0,dp(2),dp(2)) })
            return button
        }
        toolButton("LINE","CAD TOOL LINE"){session.clearSelection();canvasView.tool=Tool.LINE;report("LINE READY")}
        toolButton("RECT","CAD TOOL RECT"){session.clearSelection();canvasView.tool=Tool.RECT;report("RECT READY")}
        toolButton("CIRCLE","CAD TOOL CIRCLE"){session.clearSelection();canvasView.tool=Tool.CIRCLE;report("CIRCLE READY")}
        toolButton("HOLE","CAD TOOL HOLE"){session.clearSelection();canvasView.tool=Tool.HOLE;report("HOLE READY")}
        toolButton("SELECT","CAD TOOL SELECT"){session.clearSelection();canvasView.tool=Tool.SELECT;canvasView.invalidate();report("SELECT READY")}
        toolButton("UNDO","CAD UNDO"){if(session.undo()){canvasView.invalidate();report("UNDO")}}
        toolButton("REDO","CAD REDO"){if(session.redo()){canvasView.invalidate();report("REDO")}}
        toolButton("TRIM","CAD TRIM"){editAction("TRIM"){session.trimSelected()}}
        toolButton("EXTEND","CAD EXTEND"){editAction("EXTEND"){session.extendSelected()}}
        toolButton("OFFSET 5","CAD OFFSET 5MM"){editAction("OFFSET 5"){session.offsetSelected(5.0)}}
        toolButton("ARRAY×3","CAD ARRAY 3X"){editAction("ARRAY 3X"){session.arraySelected(3,10.0,0.0)}}
        toolButton("CHAMFER 5","CAD CHAMFER 5MM"){editAction("CHAMFER 5"){session.chamferSelected(5.0)}}
        toolButton("FILLET R5","CAD FILLET R5MM"){editAction("FILLET R5"){session.filletSelected(5.0)}}
        snapButton=toolButton("SNAP OFF","CAD SNAP CYCLE"){cycleSnapMode()}
        addView(tools,LayoutParams(-1,-2))
        addView(canvasView,LayoutParams(-1,0,1f))
        report("READY")
    }

    private fun cycleSnapMode() {
        val current=snapMode
        snapMode=if(current==null) snapModes.first() else snapModes.getOrNull(snapModes.indexOf(current)+1)
        val name=snapMode?.name ?: "OFF"
        snapButton.text=when(snapMode) {
            CleanCadSnapMode.ENDPOINT -> "SNAP END"
            CleanCadSnapMode.MIDPOINT -> "SNAP MID"
            CleanCadSnapMode.CENTER -> "SNAP CTR"
            CleanCadSnapMode.INTERSECTION -> "SNAP INT"
            CleanCadSnapMode.HORIZONTAL -> "SNAP HOR"
            CleanCadSnapMode.VERTICAL -> "SNAP VER"
            CleanCadSnapMode.TANGENT -> "SNAP TAN"
            null -> "SNAP OFF"
        }
        canvasView.clearSnapMarker()
        report("SNAP $name")
        Log.i("AIG-CLEAN-CAD","CLEAN_CAD_SNAP_MODE|$name")
    }

    private fun editAction(label:String,action:()->Unit) {
        runCatching(action).onSuccess {
            canvasView.invalidate(); report(label)
            Log.i("AIG-CLEAN-CAD","CLEAN_CAD_EDIT|$label|PASS|entities=${session.entityCount()}")
        }.onFailure {
            onStatus("CAD $label • ${it.message}")
            Log.i("AIG-CLEAN-CAD","CLEAN_CAD_EDIT|$label|BLOCKED|${it.message}")
        }
    }

    private fun report(event:String) {
        val text="CAD $event • ENTITIES=${session.entityCount()} • SELECTED=${session.selectedCount()} • 0.001 mm"
        onStatus(text)
        Log.i("AIG-CLEAN-CAD","CLEAN_CAD_STATUS|$event|entities=${session.entityCount()}|selected=${session.selectedCount()}")
    }

    private inner class CadCanvas(context:Context):View(context) {
        var tool=Tool.LINE
        private var down:World?=null
        private var lastSnap:World?=null
        private val paint=Paint(Paint.ANTI_ALIAS_FLAG)
        init { contentDescription="CLEAN CAD CANVAS"; setBackgroundColor(0xCC020407.toInt()) }

        override fun onDraw(c:Canvas) {
            super.onDraw(c)
            val scale=scalePx()
            paint.strokeWidth=1f; paint.color=0x4428D9FF
            for(i in -8..8) {
                val x=width/2f+i*(width/16f); c.drawLine(x,0f,x,height.toFloat(),paint)
                val y=height/2f+i*(height/16f); c.drawLine(0f,y,width.toFloat(),y,paint)
            }
            paint.color=Color.rgb(61,235,255); paint.strokeWidth=2f
            c.drawLine(0f,height/2f,width.toFloat(),height/2f,paint); c.drawLine(width/2f,0f,width/2f,height.toFloat(),paint)
            paint.strokeWidth=3f; paint.style=Paint.Style.STROKE
            session.primitives().forEach { p ->
                paint.color=if(p.selected) Color.rgb(255,196,64) else Color.rgb(225,240,255)
                when(p) {
                    is CleanCadPrimitive.Segment -> { val a=screen(p.ax,p.ay,scale); val b=screen(p.bx,p.by,scale); c.drawLine(a.first,a.second,b.first,b.second,paint) }
                    is CleanCadPrimitive.CircleShape -> { val q=screen(p.cx,p.cy,scale); c.drawCircle(q.first,q.second,(p.radius*scale).toFloat(),paint) }
                    is CleanCadPrimitive.HoleShape -> {
                        val q=screen(p.cx,p.cy,scale); val r=(p.radius*scale).toFloat(); c.drawCircle(q.first,q.second,r,paint)
                        c.drawLine(q.first-r*0.35f,q.second,q.first+r*0.35f,q.second,paint); c.drawLine(q.first,q.second-r*0.35f,q.first,q.second+r*0.35f,paint)
                    }
                    is CleanCadPrimitive.ArcShape -> {
                        val q=screen(p.cx,p.cy,scale); val r=(p.radius*scale).toFloat(); val box=RectF(q.first-r,q.second-r,q.first+r,q.second+r)
                        c.drawArc(box,(-p.startDeg).toFloat(),(-p.sweepDeg).toFloat(),false,paint)
                    }
                }
            }
            lastSnap?.let { q ->
                val m=screen(q.x,q.y,scale)
                paint.style=Paint.Style.STROKE; paint.strokeWidth=2f; paint.color=Color.rgb(255,196,64)
                c.drawCircle(m.first,m.second,dp(6).toFloat(),paint)
            }
            paint.style=Paint.Style.FILL
        }

        override fun onTouchEvent(e:MotionEvent):Boolean {
            when(e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    val raw=world(e.x,e.y)
                    down=if(tool==Tool.SELECT) raw else snapWorld(raw,null)
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    val a=down ?: return true
                    val raw=world(e.x,e.y)
                    val b=if(tool==Tool.SELECT) raw else snapWorld(raw,a)
                    down=null
                    if(tool==Tool.SELECT) {
                        if(session.selectedCount()>=2) session.clearSelection()
                        val ok=session.selectNearest(b.x,b.y,session.selectedCount()>0)
                        invalidate(); report(if(ok)"SELECT" else "SELECT MISS")
                        Log.i("AIG-CLEAN-CAD","CLEAN_CAD_SELECT|${if(ok)"PASS" else "MISS"}|selected=${session.selectedCount()}")
                        return true
                    }
                    runCatching {
                        when(tool) {
                            Tool.LINE -> session.addLine(a.x,a.y,b.x,b.y)
                            Tool.RECT -> session.addRect(a.x,a.y,b.x,b.y)
                            Tool.CIRCLE -> session.addCircle(a.x,a.y,hypot(b.x-a.x,b.y-a.y))
                            Tool.HOLE -> session.addHole(a.x,a.y,hypot(b.x-a.x,b.y-a.y)*2.0)
                            Tool.SELECT -> Unit
                        }
                    }.onSuccess {
                        invalidate(); val t=tool.name; report(t)
                        Log.i("AIG-CLEAN-CAD","CLEAN_CAD_MUTATION|$t|PASS|entities=${session.entityCount()}")
                    }.onFailure { onStatus("CAD INPUT • ${it.message}") }
                    return true
                }
            }
            return true
        }

        fun clearSnapMarker(){ lastSnap=null; invalidate() }

        private fun snapWorld(raw:World,reference:World?):World {
            val mode=snapMode ?: return raw
            if((mode==CleanCadSnapMode.HORIZONTAL || mode==CleanCadSnapMode.VERTICAL) && reference==null) return raw
            val q=runCatching { session.snapPoint(raw.x,raw.y,3.0,mode,reference?.x,reference?.y) }.getOrNull() ?: return raw
            val snapped=World(q.x,q.y)
            lastSnap=snapped
            Log.i("AIG-CLEAN-CAD","CLEAN_CAD_SNAP_APPLY|${mode.name}|PASS|x=${q.x}|y=${q.y}")
            invalidate()
            return snapped
        }

        private fun scalePx():Double=min(width.coerceAtLeast(1)/160.0,height.coerceAtLeast(1)/100.0).coerceAtLeast(1.0)
        private fun world(x:Float,y:Float):World { val s=scalePx(); return World((x-width/2f)/s,(height/2f-y)/s) }
        private fun screen(x:Double,y:Double,s:Double)=Pair((width/2.0+x*s).toFloat(),(height/2.0-y*s).toFloat())
    }

    private data class World(val x:Double,val y:Double)
    private fun dp(v:Int)= (v*resources.displayMetrics.density).toInt().coerceAtLeast(1)
}
