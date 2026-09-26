package com.aigstudio.app

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.view.View
import android.view.ViewGroup
import kotlin.math.max

enum class StartupMilestone(val label:String) {
    RGB_LOGO("RGB LOGO"),
    INITIALIZING_CORE("INITIALIZING CORE"),
    CHECKING_CONFIGURATION("CHECKING CONFIGURATION"),
    CHECKING_PROJECT_DATA("CHECKING PROJECT DATA"),
    LOADING_UI("LOADING UI"),
    HEALTH_CHECK("HEALTH CHECK"),
    READY("AIG II CONTROL READY")
}

class AigStartupOverlay(context: Context) : View(context) {
    private var milestone = StartupMilestone.RGB_LOGO
    private var blockedReason: String? = null
    private val bgPaint = Paint()
    private val gridPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(42,61,235,255)
        strokeWidth = resources.displayMetrics.density
    }
    private val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 32f * resources.displayMetrics.scaledDensity
        isFakeBoldText = true
    }
    private val statusPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(61,235,255)
        textSize = 14f * resources.displayMetrics.scaledDensity
    }
    private val smallPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(170,195,220)
        textSize = 11f * resources.displayMetrics.scaledDensity
    }
    private val barPaint = Paint(Paint.ANTI_ALIAS_FLAG)

    init { isClickable = true; setLayerType(LAYER_TYPE_HARDWARE,null); contentDescription = milestone.label }

    fun advance(next: StartupMilestone) {
        if (blockedReason != null || next.ordinal < milestone.ordinal) return
        milestone = next
        contentDescription = next.label
        invalidate()
    }

    fun fail(reason:String) { blockedReason = reason; invalidate() }

    fun completeAndDetach(parent: ViewGroup) {
        if (milestone != StartupMilestone.READY || blockedReason != null) return
        animate().alpha(0f).setDuration(180L).withEndAction {
            if (parent.indexOfChild(this) >= 0) parent.removeView(this)
        }.start()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        bgPaint.shader = LinearGradient(
            0f,0f,width.toFloat(),max(1,height).toFloat(),
            intArrayOf(Color.rgb(3,8,16),Color.rgb(8,18,31),Color.rgb(10,8,26)),
            null,Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f,0f,width.toFloat(),height.toFloat(),bgPaint)
        bgPaint.shader = null

        val step = 32f * resources.displayMetrics.density
        var x=0f
        while(x<width){canvas.drawLine(x,0f,x,height.toFloat(),gridPaint);x+=step}
        var y=0f
        while(y<height){canvas.drawLine(0f,y,width.toFloat(),y,gridPaint);y+=step}

        val left=28f*resources.displayMetrics.density
        val centerY=height*0.43f
        canvas.drawText("AIG CNC",left,centerY,titlePaint)
        canvas.drawText("AIG II CONTROL LINK • RGB SMART MACHINING",left,centerY+34f*resources.displayMetrics.density,smallPaint)
        val status=blockedReason?.let{"BLOCKED • $it"}?:milestone.label
        statusPaint.color=if(blockedReason==null)Color.rgb(61,235,255) else Color.rgb(255,90,90)
        canvas.drawText(status,left,centerY+72f*resources.displayMetrics.density,statusPaint)

        val progress=milestone.ordinal.toFloat()/StartupMilestone.READY.ordinal.toFloat()
        val barTop=centerY+92f*resources.displayMetrics.density
        barPaint.color=Color.argb(70,130,160,190)
        canvas.drawRoundRect(left,barTop,width-left,barTop+6f*resources.displayMetrics.density,6f,6f,barPaint)
        barPaint.color=if(blockedReason==null)Color.rgb(61,235,255) else Color.rgb(255,90,90)
        canvas.drawRoundRect(left,barTop,left+(width-2*left)*progress,barTop+6f*resources.displayMetrics.density,6f,6f,barPaint)
        canvas.drawText("v${BuildConfig.VERSION_NAME} • SDK 37 • 3D/5X FAST RENDER",left,barTop+34f*resources.displayMetrics.density,smallPaint)
    }
}
