package com.aigstudio.production

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.Log
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.aigstudio.production.runtime.CleanSimResult
import com.aigstudio.production.runtime.CleanSimSession
import java.util.Locale

class CleanSimPanel(context:Context, private val session:CleanSimSession, private val status:(String)->Unit):LinearLayout(context) {
    private val info=TextView(context)
    private val view=RemovalView(context)
    init {
        orientation=VERTICAL
        setPadding(dp(8),dp(8),dp(8),dp(8))
        info.setTextColor(Color.rgb(99,255,157)); info.textSize=12f; info.text="SIM • WAITING MANUAL CAM"
        val run=Button(context).apply { text="RUN MATERIAL REMOVAL"; contentDescription="SIM RUN TRUE MATERIAL REMOVAL" }
        run.setOnClickListener {
            runCatching { session.run() }.onSuccess { r ->
                view.result=r; view.invalidate()
                val s="SIM • CELLS=${r.removedCells} • MIN=${f(r.minDepthMm)} mm • VOL=${f(r.removedVolumeMm3)} mm³"
                info.text=s; status(s)
                Log.i("AIG-CLEAN-SIM","CLEAN_SIM_RUN|PASS|cells=${r.removedCells}|min=${r.minDepthMm}|volume=${r.removedVolumeMm3}")
            }.onFailure { e ->
                val s="SIM • ${e.message ?: "WAITING CAM"}"; info.text=s; status(s)
                Log.i("AIG-CLEAN-SIM","CLEAN_SIM_RUN|WAITING|${e.message}")
            }
        }
        addView(info,LayoutParams(-1,-2))
        addView(run,LayoutParams(-1,dp(48)))
        addView(view,LayoutParams(-1,0,1f))
        gravity=Gravity.CENTER_HORIZONTAL
    }
    private fun f(v:Double)=String.format(Locale.US,"%.3f",v)
    private fun dp(v:Int)=(v*resources.displayMetrics.density).toInt().coerceAtLeast(1)

    private class RemovalView(context:Context):View(context) {
        var result:CleanSimResult?=null
        private val cut=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(61,235,255)}
        private val stock=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(7,17,27)}
        override fun onDraw(c:Canvas){
            c.drawColor(Color.rgb(2,4,7)); val r=result ?: return
            val sx=width.toFloat()/r.nx; val sy=height.toFloat()/r.ny
            c.drawRect(0f,0f,width.toFloat(),height.toFloat(),stock)
            for(y in 0 until r.ny) for(x in 0 until r.nx){
                val d=r.depth[y*r.nx+x]
                if(d<0.0){
                    cut.alpha=(70 + ((-d/(kotlin.math.abs(r.minDepthMm).coerceAtLeast(.001)))*185).toInt()).coerceIn(70,255)
                    c.drawRect(x*sx,y*sy,(x+1)*sx+1,(y+1)*sy+1,cut)
                }
            }
        }
    }
}
