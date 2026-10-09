package com.aigstudio.production

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.GridLayout
import android.widget.LinearLayout
import com.aigstudio.production.runtime.CleanCamPoint
import com.aigstudio.production.runtime.CleanCamSession
import kotlin.math.max
import kotlin.math.min

class CleanCamPanel(context:Context, private val session:CleanCamSession, private val onStatus:(String)->Unit):LinearLayout(context) {
    private val canvasView=CamCanvas(context)
    init {
        orientation=VERTICAL
        contentDescription="CLEAN CAM PANEL"
        val tools=GridLayout(context).apply{columnCount=5;rowCount=2}
        fun action(label:String,desc:String,fn:()->Unit){
            val b=Button(context).apply{
                text=label;contentDescription=desc;isAllCaps=false;textSize=8f;setTextColor(Color.WHITE)
                setOnClickListener{runCatching{fn();canvasView.invalidate()}.onFailure{report("ERROR:${it.message}")}}
            }
            tools.addView(b,GridLayout.LayoutParams().apply{width=0;height=dp(44);columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f);setMargins(dp(2),dp(2),dp(2),dp(2))})
        }
        action("AUTO","CAM AUTO"){session.useAuto();report("AUTO")}
        action("MANUAL","CAM MANUAL"){session.startManual();report("MANUAL")}
        action("SAFE-Z","CAM SAFE-Z"){session.setSafeZ(if(session.safeZ()<8.0)8.0 else 5.0);report("SAFE-Z")}
        action("G0","CAM G0"){
            if(session.mode()!="MANUAL")session.startManual()
            val n=session.points().size.toDouble();session.addRapidPoint(10.0*n,10.0);report("G0")
        }
        action("G1","CAM G1"){
            if(session.mode()!="MANUAL")session.startManual()
            val n=session.points().size.toDouble();session.addCutPoint(10.0*n,-10.0,-2.0);report("G1")
        }
        action("SIDE","CAM SIDE"){session.toggleSide();report("SIDE")}
        action("DIR","CAM DIR"){session.toggleDirection();report("DIR")}
        action("AVOID","CAM AVOID"){
            if(session.mode()!="MANUAL")session.startManual()
            val idx=min(1,session.points().lastIndex);session.insertAvoidance(idx,40.0,20.0,-2.0);report("AVOID")
        }
        action("EDIT","CAM EDIT"){
            if(session.mode()!="MANUAL")session.startManual()
            val p=session.points()[1];session.replacePoint(1,p.x+5.0,p.y+5.0,if(p.rapid)session.safeZ() else p.z,p.rapid);report("EDIT")
        }
        addView(tools,LayoutParams(-1,-2))
        addView(canvasView,LayoutParams(-1,0,1f))
        report("READY")
    }
    private fun report(event:String){
        val text="CAM $event • MODE=${session.mode()} • PTS=${session.points().size} • SAFE-Z=${"%.3f".format(session.safeZ())} • ${session.side()} • ${session.direction()}"
        onStatus(text)
        Log.i("AIG-CLEAN-CAM","CLEAN_CAM_ACTION|$event|mode=${session.mode()}|points=${session.points().size}|safeZ=${session.safeZ()}|side=${session.side()}|dir=${session.direction()}")
    }
    private inner class CamCanvas(context:Context):View(context){
        private val paint=Paint(Paint.ANTI_ALIAS_FLAG).apply{strokeWidth=3f;style=Paint.Style.STROKE}
        init{contentDescription="CLEAN CAM PATH CANVAS";setBackgroundColor(0xD9020407.toInt())}
        override fun onDraw(c:Canvas){
            super.onDraw(c);val pts=session.points();if(pts.isEmpty())return
            val xs=pts.map{it.x};val ys=pts.map{it.y};val minX=xs.minOrNull()?:0.0;val maxX=xs.maxOrNull()?:1.0;val minY=ys.minOrNull()?:0.0;val maxY=ys.maxOrNull()?:1.0
            val spanX=max(1.0,maxX-minX);val spanY=max(1.0,maxY-minY);val sx=(width*0.75/spanX).toFloat();val sy=(height*0.65/spanY).toFloat();val scale=min(sx,sy)
            fun xy(p:CleanCamPoint):Pair<Float,Float>{val x=(width*0.12+(p.x-minX)*scale).toFloat();val y=(height*0.82-(p.y-minY)*scale).toFloat();return x to y}
            paint.color=Color.rgb(30,170,220)
            for(k in 1 until pts.size){val a=xy(pts[k-1]);val b=xy(pts[k]);paint.color=if(pts[k].rapid)Color.rgb(90,160,255) else Color.WHITE;c.drawLine(a.first,a.second,b.first,b.second,paint)}
            paint.style=Paint.Style.FILL
            pts.forEach{p->val q=xy(p);paint.color=if(p.rapid)Color.rgb(99,255,157) else Color.WHITE;c.drawCircle(q.first,q.second,6f,paint)}
            paint.style=Paint.Style.STROKE
        }
    }
    private fun dp(v:Int)=(v*resources.displayMetrics.density).toInt().coerceAtLeast(1)
}
