package com.aigstudio.app

import android.app.Activity
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.Button
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import com.aigstudio.core.*
import java.util.Collections
import java.util.Locale
import java.util.WeakHashMap
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.roundToInt

/** Visual-only 3AX/4AX/5AX/6AX cockpit skin. Never mutates CAD/CAM/NC geometry. */
object AxisCockpitSkinInstaller {
    private const val WRAP_TAG="AIG_AXIS_COCKPIT_V3_TOOL_DIRECTION"
    private val wrapped=Collections.newSetFromMap(WeakHashMap<Machining3DView,Boolean>())
    private val installedActivities=Collections.newSetFromMap(WeakHashMap<Activity,Boolean>())

    private data class LiveAxes(val a:Double,val b:Double,val c:Double)

    fun install(activity:Activity) {
        if(!installedActivities.add(activity)) return
        val decor=activity.window.decorView
        val listener=ViewTreeObserver.OnGlobalLayoutListener { scan(activity,decor) }
        decor.viewTreeObserver.addOnGlobalLayoutListener(listener)
        decor.post { scan(activity,decor) }
    }

    private fun scan(activity:Activity,view:View) {
        if(view is Machining3DView && !wrapped.contains(view)) {
            val mode=modeOf(activity,view) ?: return
            if(mode in setOf("3AX","4AX","5AX","6AX")) wrap(activity,view,mode)
            return
        }
        if(view is ViewGroup) for(i in 0 until view.childCount) scan(activity,view.getChildAt(i))
    }

    private fun modeOf(activity:Activity,view:Machining3DView):String? {
        val direct=runCatching {
            val f=view.javaClass.getDeclaredField("machineMode"); f.isAccessible=true
            (f.get(view) as? String)?.uppercase()
        }.getOrNull()
        if(direct in setOf("3AX","4AX","5AX","6AX")) return direct
        return runCatching {
            val f=activity.javaClass.getDeclaredField("machiningAxisMode");f.isAccessible=true
            (f.get(activity) as? String)?.uppercase()
        }.getOrNull()?.takeIf{it in setOf("3AX","4AX","5AX","6AX")}
    }

    private fun liveAxes(view:Machining3DView):LiveAxes? = runCatching {
        val frameField=view.javaClass.getDeclaredField("progressiveFrame").apply{isAccessible=true}
        val resultField=view.javaClass.getDeclaredField("result").apply{isAccessible=true}
        val frame=frameField.get(view) as? ProgressiveMachining3DFrame
        val result=resultField.get(view) as? Machining3DResult
        val move=frame?.toolPoint ?: result?.cam?.toolpaths?.lastOrNull()?.moves?.lastOrNull()
        move?.let { LiveAxes(it.axisA,it.axisB,it.axisC) }
    }.getOrNull()

    private fun wrap(activity:Activity,view:Machining3DView,mode:String) {
        if(!wrapped.add(view)) return
        val parent=view.parent as? ViewGroup ?: return
        if(parent.tag==WRAP_TAG) return
        if(mode=="6AX") expandSixAxisStage(activity,parent)
        val index=parent.indexOfChild(view)
        val oldParams=view.layoutParams
        parent.removeView(view)

        val skin=AxisCockpitSkinContract.mode(mode)
        val accent=Color.parseColor(skin.accentHex)
        val wrapper=LinearLayout(activity).apply {
            tag=WRAP_TAG
            orientation=LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(2,4,7))
            contentDescription=skin.skinKey+" • CLOSE VIEW • HUD EDGE • CONTROLS EDGE • TOOL DIRECTION"
        }
        var machineVariant="VERTICAL"
        var directionCameraMode:String?=null
        val hud=TextView(activity).apply {
            setTextColor(Color.rgb(225,240,255));textSize=if(mode=="6AX")9.5f else 10.5f
            setPadding(dp(activity,10),dp(activity,5),dp(activity,10),dp(activity,5))
            background=glass(activity,accent,0xCC07111B.toInt())
            maxLines=if(mode=="6AX")2 else 1
        }
        fun refreshHud() {
            if(mode!="6AX") {
                hud.text=buildString {
                    append(mode).append(" • RGB COCKPIT • 近景")
                    if(skin.visibleRotaryAxes.isNotEmpty()) append(" • ").append(skin.visibleRotaryAxes.joinToString("/"))
                }
                return
            }
            val axes=liveAxes(view) ?: LiveAxes(0.0,0.0,0.0)
            val direction=SixAxisToolDirectionContract.hud(axes.a,axes.b,axes.c)
            val preset=SixAxisToolDirectionContract.preset(direction.nearestPreset).label
            hud.text=String.format(
                Locale.US,
                "6AX • %s • A%+.3f° B%+.3f° C%+.3f°\n刀向 Tilt %.2f° • V(%+.3f,%+.3f,%+.3f) • %s",
                machineVariant,axes.a,axes.b,axes.c,direction.tiltDeg,
                direction.vector.x,direction.vector.y,direction.vector.z,preset
            )
        }
        refreshHud()
        wrapper.addView(hud,LinearLayout.LayoutParams(-1,-2))

        val modelHost=FrameLayout(activity).apply {
            setBackgroundColor(Color.rgb(3,8,16))
            val externalHudClearance=if(mode=="6AX") dp(activity,3) else dp(activity,30)
            setPadding(0,externalHudClearance,0,dp(activity,3))
        }
        modelHost.addView(view,FrameLayout.LayoutParams(-1,-1))
        val compass=if(mode=="6AX") ToolDirectionCompassView(activity) { liveAxes(view) } else null
        compass?.let { modelHost.addView(it,FrameLayout.LayoutParams(-1,-1)) }
        wrapper.addView(modelHost,LinearLayout.LayoutParams(-1,0,1f))

        val row=LinearLayout(activity).apply {
            orientation=LinearLayout.HORIZONTAL
            gravity=Gravity.CENTER_VERTICAL
            setPadding(dp(activity,4),dp(activity,3),dp(activity,4),dp(activity,3))
        }
        fun button(label:String,preset:AxisViewPreset) {
            row.addView(cockpitButton(activity,label,accent) {
                directionCameraMode=null
                applyPreset(view,mode,preset)
            },LinearLayout.LayoutParams(-2,dp(activity,42)).apply{marginEnd=dp(activity,5)})
        }
        fun directionButton(label:String) {
            row.addView(cockpitButton(activity,label,accent) {
                directionCameraMode=label
                applySixAxisDirectionView(view,label,liveAxes(view))
            },LinearLayout.LayoutParams(-2,dp(activity,42)).apply{marginEnd=dp(activity,5)})
        }

        button("近景",AxisViewPreset.CLOSE)
        if(mode=="6AX") {
            directionButton("加工視角")
            directionButton("刀軸視角")
            directionButton("側視")
            directionButton("上視")
        }
        button("FIT加工區",AxisViewPreset.MACHINING_FIT)
        button("全機台",AxisViewPreset.FULL_MACHINE)
        button("RESET VIEW",AxisViewPreset.RESET)
        if(mode=="6AX") {
            row.addView(cockpitButton(activity,"機型",accent) {
                machineVariant=if(machineVariant=="VERTICAL")"HORIZONTAL" else "VERTICAL"
                refreshHud()
                wrapper.background=glass(activity,if(machineVariant=="HORIZONTAL")0xFF27E9FF.toInt() else accent,0xEE020407.toInt())
            },LinearLayout.LayoutParams(-2,dp(activity,42)))
        }
        wrapper.addView(HorizontalScrollView(activity).apply {
            isHorizontalScrollBarEnabled=false;isFillViewport=false;addView(row)
        },LinearLayout.LayoutParams(-1,-2))

        parent.addView(wrapper,index,oldParams)
        applyPreset(view,mode,AxisViewPreset.CLOSE)
        if(mode=="6AX") {
            val updater=object:Runnable {
                override fun run() {
                    if(!hud.isAttachedToWindow) return
                    refreshHud()
                    if(directionCameraMode=="刀軸視角") {
                        applySixAxisDirectionView(view,"刀軸視角",liveAxes(view))
                    }
                    compass?.invalidate()
                    hud.postDelayed(this,100L)
                }
            }
            hud.post(updater)
        }
    }

    private fun applyPreset(view:Machining3DView,mode:String,preset:AxisViewPreset) {
        setNumber(view,"zoom",AxisCockpitSkinContract.zoomFor(preset))
        setNumber(view,"panX",0f);setNumber(view,"panY",0f)
        if(preset==AxisViewPreset.RESET) {
            val angles=AxisCockpitSkinContract.cameraAngles(mode)
            setNumber(view,"rotateX",angles.first);setNumber(view,"rotateY",angles.second)
        }
        view.postInvalidateOnAnimation()
    }

    private fun applySixAxisDirectionView(view:Machining3DView,action:String,axes:LiveAxes?) {
        setNumber(view,"panX",0f);setNumber(view,"panY",0f)
        setNumber(view,"zoom",AxisCockpitSkinContract.CLOSE_ZOOM)
        val angles=when(action) {
            "加工視角" -> AxisCockpitSkinContract.cameraAngles("6AX")
            "刀軸視角" -> axes?.let { SixAxisToolDirectionContract.cameraAnglesAlongTool(it.a,it.b) }
                ?: AxisCockpitSkinContract.cameraAngles("6AX")
            "側視" -> 0.0 to 90.0
            "上視" -> -89.0 to 0.0
            else -> AxisCockpitSkinContract.cameraAngles("6AX")
        }
        setNumber(view,"rotateX",angles.first);setNumber(view,"rotateY",angles.second)
        view.postInvalidateOnAnimation()
    }

    private fun setNumber(target:Any,name:String,value:Number) {
        runCatching {
            val f=target.javaClass.getDeclaredField(name);f.isAccessible=true
            when(f.type) {
                java.lang.Double.TYPE -> f.setDouble(target,value.toDouble())
                java.lang.Float.TYPE -> f.setFloat(target,value.toFloat())
                else -> f.set(target,value)
            }
        }
    }

    private fun expandSixAxisStage(activity:Activity,stage:ViewGroup) {
        val lp=stage.layoutParams ?: return
        val desired=(activity.resources.displayMetrics.heightPixels*AxisCockpitSkinContract.PORTRAIT_VISUAL_FRACTION).roundToInt()
            .coerceIn(dp(activity,360),dp(activity,620))
        if(lp.height>0) {
            lp.height=max(lp.height,desired);stage.layoutParams=lp
        }
    }

    private fun cockpitButton(context:Context,label:String,accent:Int,run:()->Unit)=Button(context).apply {
        text=label;isAllCaps=false;maxLines=1;textSize=10f
        setTextColor(Color.rgb(225,240,255));setPadding(dp(context,10),0,dp(context,10),0)
        background=glass(context,accent,0xB307111B.toInt())
        setOnClickListener{run()}
    }

    private fun glass(context:Context,accent:Int,fill:Int)=GradientDrawable(
        GradientDrawable.Orientation.TOP_BOTTOM,
        intArrayOf(fill,Color.argb(205,2,4,7))
    ).apply {
        cornerRadius=dp(context,12).toFloat();setStroke(dp(context,1),accent)
    }

    private class ToolDirectionCompassView(
        context:Context,
        private val axesProvider:()->LiveAxes?
    ):View(context) {
        private val density=resources.displayMetrics.density
        private val panel=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.argb(176,3,8,16)}
        private val line=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(61,235,255);strokeWidth=2.4f*density;strokeCap=Paint.Cap.ROUND}
        private val tip=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(255,78,205);style=Paint.Style.FILL}
        private val text=Paint(Paint.ANTI_ALIAS_FLAG).apply{color=Color.rgb(225,240,255);textSize=9f*resources.displayMetrics.scaledDensity}
        init { isClickable=false;isFocusable=false }
        override fun onDraw(canvas:Canvas) {
            super.onDraw(canvas)
            val axes=axesProvider() ?: return
            val hud=SixAxisToolDirectionContract.hud(axes.a,axes.b,axes.c)
            val size=104f*density
            val left=(width-size-8f*density).coerceAtLeast(0f)
            val top=8f*density
            val right=left+size
            val bottom=top+size
            canvas.drawRoundRect(left,top,right,bottom,12f*density,12f*density,panel)
            val cx=left+size/2f
            val cy=top+size/2f
            val xy=hypot(hud.vector.x,hud.vector.y)
            if(xy>0.04) {
                val reach=34f*density
                val ex=(cx+hud.vector.x/xy*reach).toFloat()
                val ey=(cy-hud.vector.y/xy*reach).toFloat()
                canvas.drawLine(cx,cy,ex,ey,line)
                canvas.drawCircle(ex,ey,4f*density,tip)
            } else {
                canvas.drawCircle(cx,cy,7f*density,line)
                canvas.drawCircle(cx,cy,3f*density,tip)
            }
            canvas.drawText("TOOL VECTOR",left+8f*density,top+14f*density,text)
            canvas.drawText(String.format(Locale.US,"Tilt %.1f°  Z%+.2f",hud.tiltDeg,hud.vector.z),left+8f*density,bottom-8f*density,text)
        }
    }

    private fun dp(context:Context,v:Int)=(v*context.resources.displayMetrics.density).roundToInt()
}
