package com.aigstudio.app

import android.content.Context
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.view.View
import android.view.ViewGroup
import com.aigstudio.core.*
import kotlin.math.max

object StudioStartupBootGuard {
    private const val PREF="aig_studio_startup_guard"
    private const val KEY_IN_PROGRESS="in_progress"
    private const val KEY_STAGE="last_stage"

    fun begin(context:Context):StudioStartupStage? {
        val prefs=context.getSharedPreferences(PREF,Context.MODE_PRIVATE)
        val previous=if(prefs.getBoolean(KEY_IN_PROGRESS,false)) {
            prefs.getString(KEY_STAGE,null)?.let { runCatching{StudioStartupStage.valueOf(it)}.getOrNull() }
        } else null
        prefs.edit().putBoolean(KEY_IN_PROGRESS,true)
            .putString(KEY_STAGE,StudioStartupStage.BOOTSTRAP.name).commit()
        return previous
    }

    fun mark(context:Context,stage:StudioStartupStage) {
        context.getSharedPreferences(PREF,Context.MODE_PRIVATE)
            .edit().putString(KEY_STAGE,stage.name).commit()
    }

    fun complete(context:Context) {
        context.getSharedPreferences(PREF,Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_IN_PROGRESS,false)
            .putString(KEY_STAGE,StudioStartupStage.HOME.name).commit()
    }
}

enum class StartupMilestone(val label:String,val stage:StudioStartupStage) {
    RGB_LOGO("AIG CNC 啟動",StudioStartupStage.BOOTSTRAP),
    SAFE_THEME("載入安全 RGB 主題",StudioStartupStage.SAFE_THEME),
    INITIALIZING_CORE("初始化 CAD/CAM 核心",StudioStartupStage.CORE),
    CHECKING_CONFIGURATION("載入環境設定",StudioStartupStage.CONFIGURATION),
    LOADING_UI("載入 UI / Renderer",StudioStartupStage.UI_RENDERER),
    CHECKING_PROJECT_DATA("檢查專案 / Recovery",StudioStartupStage.PROJECT_DATA),
    HEALTH_CHECK("執行 Runtime 健康檢查",StudioStartupStage.HEALTH),
    WRAPPING_UP("完成啟動收尾",StudioStartupStage.WRAP_UP),
    READY("AIG CNC READY",StudioStartupStage.HOME)
}

class AigStartupOverlay(context: Context) : View(context) {
    private var milestone = StartupMilestone.RGB_LOGO
    private var blockedReason: String? = null
    private var qualityMode = StudioStartupQualityMode.STANDARD
    private var safeBoot = false
    private val bgPaint = Paint()
    private val visualPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply { alpha = 205 }
    private val originalVisual = runCatching {
        context.assets.open(UiAssetContract.STARTUP_VISUAL).use { BitmapFactory.decodeStream(it) }
    }.getOrNull()
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

    init {
        isClickable = true
        setLayerType(LAYER_TYPE_HARDWARE,null)
        contentDescription = milestone.label
    }

    fun setRuntimeProfile(quality:StudioStartupQualityMode,isSafeBoot:Boolean) {
        qualityMode=quality
        safeBoot=isSafeBoot
        invalidate()
    }

    fun advance(next: StartupMilestone) {
        if (blockedReason != null) return
        if (!StudioStartupEngineContract.canAdvance(milestone.stage,next.stage)) return
        milestone = next
        StudioStartupBootGuard.mark(context,next.stage)
        contentDescription = next.label
        invalidate()
    }

    fun fail(reason:String) { blockedReason = reason; invalidate() }

    fun completeAndDetach(parent: ViewGroup) {
        if (milestone != StartupMilestone.READY || blockedReason != null) return
        StudioStartupBootGuard.complete(context)
        animate().alpha(0f).setDuration(180L).withEndAction {
            if (parent.indexOfChild(this) >= 0) parent.removeView(this)
        }.start()
        parent.postDelayed({
            if (parent.indexOfChild(this) >= 0) {
                alpha = 0f
                parent.removeView(this)
            }
        }, 450L)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        bgPaint.shader = LinearGradient(
            0f,0f,width.toFloat(),max(1,height).toFloat(),
            if(safeBoot)
                intArrayOf(Color.rgb(3,8,12),Color.rgb(7,14,20),Color.rgb(3,8,12))
            else
                intArrayOf(Color.rgb(3,8,16),Color.rgb(8,18,31),Color.rgb(10,8,26)),
            null,Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f,0f,width.toFloat(),height.toFloat(),bgPaint)
        bgPaint.shader = null

        originalVisual?.let { bitmap ->
            val srcRatio=bitmap.width.toFloat()/bitmap.height.toFloat()
            val dstRatio=width.toFloat()/height.toFloat()
            val now=(android.os.SystemClock.uptimeMillis()%8000L)/8000f
            val zoom=1.02f+0.035f*kotlin.math.sin(now*2f*Math.PI).toFloat()
            val baseW=if(srcRatio>dstRatio) height*srcRatio else width.toFloat()
            val baseH=if(srcRatio>dstRatio) height.toFloat() else width/srcRatio
            val dw=baseW*zoom
            val dh=baseH*zoom
            val pan=(now-0.5f)*16f*resources.displayMetrics.density
            val dst=android.graphics.RectF((width-dw)/2f+pan,(height-dh)/2f,dw+(width-dw)/2f+pan,dh+(height-dh)/2f)
            canvas.drawBitmap(bitmap,null,dst,visualPaint)
            canvas.drawColor(Color.argb(if(safeBoot)185 else 118,2,7,14))
            val scanY=(now*height).coerceIn(0f,height.toFloat())
            barPaint.color=Color.argb(75,61,235,255)
            canvas.drawRect(0f,scanY,width.toFloat(),scanY+1.5f*resources.displayMetrics.density,barPaint)
            postInvalidateOnAnimation()
        }

        val step = 32f * resources.displayMetrics.density
        var x=0f
        while(x<width){canvas.drawLine(x,0f,x,height.toFloat(),gridPaint);x+=step}
        var y=0f
        while(y<height){canvas.drawLine(0f,y,width.toFloat(),y,gridPaint);y+=step}

        val left=28f*resources.displayMetrics.density
        val centerY=height*0.40f
        canvas.drawText("AIG CNC",left,centerY,titlePaint)
        canvas.drawText("CAD • CAM • SIM • 3AX • 4AX • 5AX • NC • AI",left,centerY+34f*resources.displayMetrics.density,smallPaint)
        val status=blockedReason?.let{"BLOCKED • $it"}?:milestone.label
        statusPaint.color=if(blockedReason==null)Color.rgb(61,235,255) else Color.rgb(255,90,90)
        canvas.drawText(status,left,centerY+72f*resources.displayMetrics.density,statusPaint)

        val progress=StudioStartupEngineContract.progressBefore(milestone.stage)
        val barTop=centerY+92f*resources.displayMetrics.density
        barPaint.color=Color.argb(70,130,160,190)
        canvas.drawRoundRect(left,barTop,width-left,barTop+6f*resources.displayMetrics.density,6f,6f,barPaint)
        barPaint.shader=LinearGradient(
            left,barTop,width-left,barTop,
            intArrayOf(Color.rgb(255,72,210),Color.rgb(61,235,255),Color.rgb(68,255,156),Color.rgb(255,190,76)),
            null,Shader.TileMode.CLAMP
        )
        val progressRight=left+(width-2*left)*(progress/100f)
        canvas.drawRoundRect(left,barTop,progressRight,barTop+6f*resources.displayMetrics.density,6f,6f,barPaint)
        barPaint.shader=null
        canvas.drawText(
            "$progress% • ${qualityMode.name}" + if(safeBoot) " • SAFE BOOT" else "",
            left,barTop+30f*resources.displayMetrics.density,smallPaint
        )
        val version=runCatching { context.packageManager.getPackageInfo(context.packageName,0).versionName }.getOrNull().orEmpty()
        canvas.drawText(
            "v$version • ${StudioStartupEngineContract.PROFILE} • 0.001 mm",
            left,barTop+54f*resources.displayMetrics.density,smallPaint
        )
    }
}
