package com.aigstudio.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.graphics.Color
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewTreeObserver
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.Toast
import com.aigstudio.core.*
import java.util.Collections
import java.util.WeakHashMap
import kotlin.math.roundToInt

/** One-button CAM workflow adapter. Existing camSettings/CAD/CAM/SIM/NC remain authoritative. */
object CamWorkflowOverlayInstaller {
    private val installed=Collections.newSetFromMap(WeakHashMap<Activity,Boolean>())

    fun install(activity:Activity) {
        if(!installed.add(activity)) return
        val host=activity.findViewById<FrameLayout>(android.R.id.content) ?: return
        val button=RgbGlowButton(activity).apply {
            text=CamWorkflowUiContract.singleEntryButton
            contentDescription="CAM TOOLPATH MULTI FUNCTION"
            minHeight=dp(activity,44)
            minimumWidth=dp(activity,76)
            setRgbState(Color.rgb(61,235,255),false)
            visibility=View.GONE
            setOnClickListener { showMenu(activity) }
        }
        host.addView(button,FrameLayout.LayoutParams(dp(activity,84),dp(activity,48),Gravity.END or Gravity.BOTTOM).apply {
            marginEnd=dp(activity,10);bottomMargin=dp(activity,70)
        })
        val listener=ViewTreeObserver.OnGlobalLayoutListener {
            button.visibility=if(isCamActive(activity)) View.VISIBLE else View.GONE
        }
        host.viewTreeObserver.addOnGlobalLayoutListener(listener)
        host.post { button.visibility=if(isCamActive(activity)) View.VISIBLE else View.GONE }
    }

    private fun isCamActive(activity:Activity):Boolean = runCatching {
        val f=activity.javaClass.getDeclaredField("activeCategory");f.isAccessible=true
        CamWorkflowUiContract.isStudioCamCategory(f.get(activity) as? String)
    }.getOrDefault(false)

    private fun showMenu(activity:Activity) {
        AlertDialog.Builder(activity)
            .setTitle("CAM • 刀路")
            .setItems(CamWorkflowUiContract.actions.toTypedArray()) { _,which ->
                when(CamWorkflowUiContract.actions[which]) {
                    "外銑" -> applyIntent(activity,CamMachiningIntent.WORKPIECE_OUTER)
                    "內銑" -> applyIntent(activity,CamMachiningIntent.INNER_CONTOUR)
                    "型腔" -> buildPocket(activity)
                    "方向" -> editDirection(activity)
                    "起/落刀" -> editEntryExit(activity)
                    "避讓壓板" -> editBypass(activity)
                    "Safe-Z" -> editSafeZ(activity)
                }
            }
            .setNegativeButton("關閉",null)
            .show()
    }

    private fun settings(activity:Activity):CamSettings {
        val f=activity.javaClass.getDeclaredField("camSettings");f.isAccessible=true
        return f.get(activity) as CamSettings
    }

    private fun setSettings(activity:Activity,value:CamSettings,reason:String) {
        val f=activity.javaClass.getDeclaredField("camSettings");f.isAccessible=true;f.set(activity,value)
        invoke(activity,"markCamDerivedStale",arrayOf(String::class.java),arrayOf(reason))
        invoke(activity,"markProjectDirty",emptyArray(),emptyArray())
        Toast.makeText(activity,"CAM • $reason • STALE • 請按重算",Toast.LENGTH_SHORT).show()
    }

    private fun snapshot(activity:Activity):DrawingSnapshot {
        val f=activity.javaClass.getDeclaredField("cad");f.isAccessible=true
        val cad=f.get(activity)
        val m=cad.javaClass.getMethod("snapshot")
        return m.invoke(cad) as DrawingSnapshot
    }

    private fun ensureManual(activity:Activity):CamSettings {
        val current=settings(activity)
        if(current.pathMode==CamPathMode.MANUAL && current.manualPath.size>=2) return current
        val snap=snapshot(activity)
        return if(snap.entities.isNotEmpty()) {
            val auto=CamModel.fromCad(System.currentTimeMillis(),snap,current.copy(pathMode=CamPathMode.AUTO))
            ManualCamPathEngine.adoptAuto(auto)
        } else ManualCamPathEngine.startBlank(current,0.0,0.0)
    }

    private fun applyIntent(activity:Activity,intent:CamMachiningIntent) = runAction(activity) {
        val next=CamWorkflowEngine.applyIntent(settings(activity),intent)
        setSettings(activity,next,CamWorkflowEngine.profile(intent).label)
    }

    private fun buildPocket(activity:Activity)=runAction(activity) {
        val snap=snapshot(activity)
        val next=CamWorkflowEngine.buildCommonPocket(
            snap.entities,
            CamWorkflowEngine.applyIntent(settings(activity),CamMachiningIntent.MOLD_POCKET)
        )
        setSettings(activity,next,"模具型腔 • MANUAL POCKET")
    }

    private fun editDirection(activity:Activity)=runAction(activity) {
        val s=ensureManual(activity)
        val first=s.manualPath.indexOfFirst{!it.rapid}.coerceAtLeast(0)
        val last=s.manualPath.indexOfLast{!it.rapid}.coerceAtLeast(first)
        val box=column(activity)
        val from=field(activity,box,"起始點 P# (1-based)",(first+1).toString(),false)
        val to=field(activity,box,"終止點 P# (1-based)",(last+1).toString(),false)
        AlertDialog.Builder(activity).setTitle("CAM • 反轉某段走刀方向").setView(box)
            .setMessage("僅反轉所選的直線切削節點；ARC 需重新定義，避免圓弧中心資訊被誤反轉。")
            .setPositiveButton("套用"){_,_->runAction(activity){
                val a=from.text.toString().toInt()-1;val b=to.text.toString().toInt()-1
                setSettings(activity,CamWorkflowEngine.reverseLinearCutSpan(s,a,b),"走刀方向反轉 P${a+1}..P${b+1}")
            }}.setNegativeButton("取消",null).show()
    }

    private fun editEntryExit(activity:Activity)=runAction(activity) {
        val s=ensureManual(activity)
        val entry=s.manualPath.firstOrNull{!it.rapid} ?: error("尚無切削點")
        val exit=s.manualPath.lastOrNull{!it.rapid} ?: error("尚無切削點")
        val box=column(activity)
        val ex=field(activity,box,"起刀 X",entry.x);val ey=field(activity,box,"起刀 Y",entry.y);val ez=field(activity,box,"起刀 Z",entry.z)
        val xx=field(activity,box,"落刀/末端 X",exit.x);val xy=field(activity,box,"落刀/末端 Y",exit.y);val xz=field(activity,box,"落刀/末端 Z",exit.z)
        AlertDialog.Builder(activity).setTitle("CAM • 起刀 / 落刀點").setView(box)
            .setPositiveButton("套用"){_,_->runAction(activity){
                var next=CamWorkflowEngine.moveCutEntry(s,ex.d(),ey.d(),ez.d())
                next=CamWorkflowEngine.moveCutExit(next,xx.d(),xy.d(),xz.d())
                setSettings(activity,next,"起刀/落刀更新")
            }}.setNegativeButton("取消",null).show()
    }

    private fun editBypass(activity:Activity)=runAction(activity) {
        val s=ensureManual(activity)
        val firstCut=s.manualPath.indexOfFirst{!it.rapid}.coerceAtLeast(0)
        val current=s.manualPath[firstCut]
        val next=s.manualPath.getOrNull(firstCut+1) ?: current
        val box=column(activity)
        val p=field(activity,box,"從 P# 後插入避讓",(firstCut+1).toString(),false)
        val lift=field(activity,box,"抬刀 Z / Safe-Z",s.safeZ)
        val sx=field(activity,box,"安全座標 X",current.x);val sy=field(activity,box,"安全座標 Y",current.y)
        val lx=field(activity,box,"落刀 X",next.x);val ly=field(activity,box,"落刀 Y",next.y)
        val lz=field(activity,box,"落刀 Z",if(next.rapid)s.depth else next.z)
        AlertDialog.Builder(activity).setTitle("CAM • 閃壓板 / 夾具").setView(box)
            .setMessage("原位抬刀 → Safe-Z → 安全 X/Y → 落刀 X/Y 上方 → 落刀 → 繼續銑；A/B/C 姿態保持。")
            .setPositiveButton("插入"){_,_->runAction(activity){
                val i=p.text.toString().toInt()-1
                val changed=CamWorkflowEngine.insertFixtureBypass(s,i,lift.d(),sx.d(),sy.d(),lx.d(),ly.d(),lz.d())
                setSettings(activity,changed,"壓板避讓插入")
            }}.setNegativeButton("取消",null).show()
    }

    private fun editSafeZ(activity:Activity)=runAction(activity) {
        val s=settings(activity)
        val box=column(activity)
        val z=field(activity,box,"Safe-Z mm",s.safeZ)
        AlertDialog.Builder(activity).setTitle("CAM • Safe-Z").setView(box)
            .setMessage("提高 Safe-Z 時，MANUAL 內低於新 Safe-Z 的 G0 節點會一起抬高；切削 Z 不變。")
            .setPositiveButton("套用"){_,_->runAction(activity){
                setSettings(activity,CamWorkflowEngine.updateSafeZ(s,z.d()),"Safe-Z ${z.d()}")
            }}.setNegativeButton("取消",null).show()
    }

    private fun runAction(activity:Activity,block:()->Unit) {
        runCatching(block).onFailure {
            AlertDialog.Builder(activity).setTitle("CAM 訊息")
                .setMessage(it.message ?: "CAM workflow error")
                .setPositiveButton("確定",null).show()
        }
    }

    private fun invoke(activity:Activity,name:String,types:Array<Class<*>>,args:Array<Any>) {
        runCatching { activity.javaClass.getDeclaredMethod(name,*types).apply{isAccessible=true}.invoke(activity,*args) }
    }

    private fun column(context:Context)=LinearLayout(context).apply {
        orientation=LinearLayout.VERTICAL;setPadding(dp(context,12),dp(context,8),dp(context,12),dp(context,6))
    }
    private fun field(context:Context,box:LinearLayout,hint:String,value:Double)=field(context,box,hint,DisplayFormat.mm(value),true)
    private fun field(context:Context,box:LinearLayout,hint:String,value:String,decimal:Boolean)=EditText(context).apply {
        this.hint=hint;setText(value)
        inputType=InputType.TYPE_CLASS_NUMBER or (if(decimal) InputType.TYPE_NUMBER_FLAG_DECIMAL or InputType.TYPE_NUMBER_FLAG_SIGNED else 0)
        box.addView(this)
    }
    private fun EditText.d()=text.toString().toDouble()
    private fun dp(context:Context,v:Int)=(v*context.resources.displayMetrics.density).roundToInt()
}
