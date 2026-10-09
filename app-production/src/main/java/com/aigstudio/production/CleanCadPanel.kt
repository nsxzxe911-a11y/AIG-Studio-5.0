package com.aigstudio.production

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.drawable.GradientDrawable
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.GridLayout
import android.widget.LinearLayout
import com.aigstudio.production.runtime.CleanCadPrimitive
import com.aigstudio.production.runtime.CleanCadSession
import kotlin.math.hypot
import kotlin.math.min

class CleanCadPanel(context:Context, private val session:CleanCadSession, private val onStatus:(String)->Unit):LinearLayout(context) {
    private enum class Tool { LINE, RECT, CIRCLE }
    private val canvasView=CadCanvas(context)

    init {
        orientation=VERTICAL
        setPadding(dp(4),dp(4),dp(4),dp(4))
        background=GradientDrawable().apply { setColor(0xD0020407.toInt()); setStroke(dp(1),Color.rgb(61,235,255)); cornerRadius=dp(10).toFloat() }
        val tools=GridLayout(context).apply { columnCount=5 }
        fun toolButton(label:String,desc:String,action:()->Unit) {
            tools.addView(Button(context).apply {
                text=label; contentDescription=desc; isAllCaps=false; textSize=9f; setTextColor(Color.WHITE)
                background=GradientDrawable().apply { setColor(0xCC07111B.toInt()); setStroke(dp(1),Color.rgb(61,235,255)); cornerRadius=dp(8).toFloat() }
                setOnClickListener { action() }
            },GridLayout.LayoutParams().apply { width=0; height=dp(42); columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f); setMargins(dp(2),0,dp(2),dp(2)) })
        }
        toolButton("LINE","CAD TOOL LINE"){canvasView.tool=Tool.LINE; report("LINE READY")}
        toolButton("RECT","CAD TOOL RECT"){canvasView.tool=Tool.RECT; report("RECT READY")}
        toolButton("CIRCLE","CAD TOOL CIRCLE"){canvasView.tool=Tool.CIRCLE; report("CIRCLE READY")}
        toolButton("UNDO","CAD UNDO"){if(session.undo()){canvasView.invalidate(); report("UNDO")}}
        toolButton("REDO","CAD REDO"){if(session.redo()){canvasView.invalidate(); report("REDO")}}
        addView(tools,LayoutParams(-1,-2))
        addView(canvasView,LayoutParams(-1,0,1f))
        report("READY")
    }

    private fun report(event:String) {
        val text="CAD $event • ENTITIES=${session.entityCount()} • 0.001 mm"
        onStatus(text)
        Log.i("AIG-CLEAN-CAD","CLEAN_CAD_STATUS|$event|entities=${session.entityCount()}")
    }

    private inner class CadCanvas(context:Context):View(context) {
        var tool=Tool.LINE
        private var down:World?=null
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
            paint.color=Color.rgb(225,240,255); paint.strokeWidth=3f; paint.style=Paint.Style.STROKE
            session.primitives().forEach { p ->
                when(p) {
                    is CleanCadPrimitive.Segment -> { val a=screen(p.ax,p.ay,scale); val b=screen(p.bx,p.by,scale); c.drawLine(a.first,a.second,b.first,b.second,paint) }

                    is CleanCadPrimitive.CircleShape -> { val q=screen(p.cx,p.cy,scale); c.drawCircle(q.first,q.second,(p.radius*scale).toFloat(),paint) }
                }
            }
            paint.style=Paint.Style.FILL
        }

        override fun onTouchEvent(e:MotionEvent):Boolean {
            when(e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { down=world(e.x,e.y); return true }
                MotionEvent.ACTION_UP -> {
                    val a=down ?: return true; val b=world(e.x,e.y); down=null
                    runCatching {
                        when(tool) {
                            Tool.LINE -> session.addLine(a.x,a.y,b.x,b.y)
                            Tool.RECT -> session.addRect(a.x,a.y,b.x,b.y)
                            Tool.CIRCLE -> session.addCircle(a.x,a.y,hypot(b.x-a.x,b.y-a.y))
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

        private fun scalePx():Double=min(width.coerceAtLeast(1)/160.0,height.coerceAtLeast(1)/100.0).coerceAtLeast(1.0)
        private fun world(x:Float,y:Float):World { val s=scalePx(); return World((x-width/2f)/s,(height/2f-y)/s) }
        private fun screen(x:Double,y:Double,s:Double)=Pair((width/2.0+x*s).toFloat(),(height/2.0-y*s).toFloat())
    }

    private data class World(val x:Double,val y:Double)
    private fun dp(v:Int)= (v*resources.displayMetrics.density).toInt().coerceAtLeast(1)
}
