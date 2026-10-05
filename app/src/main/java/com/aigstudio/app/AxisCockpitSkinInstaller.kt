package com.aigstudio.app

import android.app.Activity
import android.content.Context
import android.graphics.Color
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
import com.aigstudio.core.AxisCockpitSkinContract
import com.aigstudio.core.AxisViewPreset
import java.util.Collections
import java.util.WeakHashMap
import kotlin.math.max
import kotlin.math.roundToInt

/** Visual-only 3AX/4AX/5AX/6AX cockpit skin. Never mutates CAD/CAM/NC geometry. */
object AxisCockpitSkinInstaller {
    private const val WRAP_TAG="AIG_AXIS_COCKPIT_V2"
    private val wrapped=Collections.newSetFromMap(WeakHashMap<Machining3DView,Boolean>())
    private val installedActivities=Collections.newSetFromMap(WeakHashMap<Activity,Boolean>())

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
            contentDescription=skin.skinKey+" • CLOSE VIEW • HUD EDGE • CONTROLS EDGE"
        }
        val hud=TextView(activity).apply {
            text=buildString {
                append(mode).append(" • RGB COCKPIT • 近景")
                if(skin.visibleRotaryAxes.isNotEmpty()) append(" • ").append(skin.visibleRotaryAxes.joinToString("/"))
                if(mode=="6AX") append(" • VERTICAL")
            }
            setTextColor(Color.rgb(225,240,255));textSize=10.5f
            setPadding(dp(activity,10),dp(activity,5),dp(activity,10),dp(activity,5))
            background=glass(activity,accent,0xCC07111B.toInt())
        }
        wrapper.addView(hud,LinearLayout.LayoutParams(-1,-2))

        val modelHost=FrameLayout(activity).apply {
            setBackgroundColor(Color.rgb(3,8,16))
            val externalHudClearance=if(mode=="6AX") dp(activity,3) else dp(activity,30)
            setPadding(0,externalHudClearance,0,dp(activity,3))
        }
        modelHost.addView(view,FrameLayout.LayoutParams(-1,-1))
        wrapper.addView(modelHost,LinearLayout.LayoutParams(-1,0,1f))

        val row=LinearLayout(activity).apply {
            orientation=LinearLayout.HORIZONTAL
            gravity=Gravity.CENTER_VERTICAL
            setPadding(dp(activity,4),dp(activity,3),dp(activity,4),dp(activity,3))
        }
        fun button(label:String,preset:AxisViewPreset) {
            row.addView(cockpitButton(activity,label,accent) { applyPreset(view,mode,preset) },LinearLayout.LayoutParams(-2,dp(activity,42)).apply{marginEnd=dp(activity,5)})
        }
        button("近景",AxisViewPreset.CLOSE)
        button("FIT加工區",AxisViewPreset.MACHINING_FIT)
        button("全機台",AxisViewPreset.FULL_MACHINE)
        button("RESET VIEW",AxisViewPreset.RESET)
        if(mode=="6AX") {
            var horizontal=false
            row.addView(cockpitButton(activity,"機型",accent) {
                horizontal=!horizontal
                hud.text="6AX • RGB COCKPIT • "+(if(horizontal)"HORIZONTAL" else "VERTICAL")+" • A/B/C"
                wrapper.background=glass(activity,if(horizontal)0xFF27E9FF.toInt() else accent,0xEE020407.toInt())
            },LinearLayout.LayoutParams(-2,dp(activity,42)))
        }
        wrapper.addView(HorizontalScrollView(activity).apply {
            isHorizontalScrollBarEnabled=false;isFillViewport=false;addView(row)
        },LinearLayout.LayoutParams(-1,-2))

        parent.addView(wrapper,index,oldParams)
        applyPreset(view,mode,AxisViewPreset.CLOSE)
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

    private fun dp(context:Context,v:Int)=(v*context.resources.displayMetrics.density).roundToInt()
}
