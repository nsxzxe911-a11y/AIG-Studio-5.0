package com.aigstudio.app.tutorial

import android.app.Activity
import android.app.AlertDialog
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.aigstudio.app.RgbGlowButton
import com.aigstudio.core.tutorial.*
import java.util.Collections
import java.util.WeakHashMap

class TutorialDialogRenderer(private val activity:Activity,private val adapter:TutorialRuntimeAdapter) {
    private val prefs=activity.getSharedPreferences("aig_tutorial",Activity.MODE_PRIVATE)

    fun showEntry() {
        val items=arrayOf("AI 導航","教程中心","目前頁面說明","嘴炮模式")
        AlertDialog.Builder(activity).setTitle("AI 教程")
            .setItems(items) { _,which ->
                when(which) {
                    0 -> showNavigation()
                    1 -> showTutorialCenter()
                    2 -> adapter.openCurrentPageHelp(adapter.currentPageTarget())
                    3 -> showBanterSelector()
                }
            }.setNegativeButton("關閉",null).show()
    }

    fun showLesson(lessonId:String) {
        val lesson=adapter.pack.lessonById(lessonId) ?: return showUnavailable(lessonId)
        val step=lesson.steps.firstOrNull() ?: return showUnavailable(lessonId)
        val level=currentBanter()
        val expression=runCatching { AiExpression.valueOf(step.expressionId) }.getOrDefault(AiExpression.NEUTRAL)
        val shown=presentTutorialFact(TutorialFact(lesson.lessonId,step.fact,step.actionTarget),level,expression)
        val message=buildString {
            append(shown.fact.factualText)
            shown.emoji?.let { append("\n\n").append(it) }
            shown.secondaryText?.let { append("\n").append(it) }
        }
        val builder=AlertDialog.Builder(activity).setTitle(lesson.titleZhTw).setMessage(message).setNegativeButton("關閉",null)
        val actionTarget=step.actionTarget
        if(actionTarget!=null) builder.setPositiveButton("執行此步") { _,_ -> adapter.invokeActionTarget(actionTarget) }
        builder.show()
    }

    fun showUnavailable(target:String) {
        AlertDialog.Builder(activity).setTitle("教程暫不可用")
            .setMessage("目前頁面說明暫無對應教程：$target\nRuntime 繼續運作。")
            .setPositiveButton("知道了",null).show()
    }

    private fun showNavigation() {
        val page=adapter.currentPageTarget()
        val lesson=adapter.lessonForPage(page)
        if(lesson==null) showUnavailable(page) else AlertDialog.Builder(activity)
            .setTitle("AI 導航")
            .setMessage("目前頁面：$page\n建議教程：$lesson")
            .setPositiveButton("開啟教程") { _,_ -> adapter.openTutorial(lesson) }
            .setNegativeButton("取消",null).show()
    }

    private fun showTutorialCenter() {
        val lessons=adapter.pack.lessons
        if(lessons.isEmpty()) return showUnavailable(TutorialPack.TUTORIAL_UNAVAILABLE)
        val titles=lessons.map { it.titleZhTw }.toTypedArray()
        AlertDialog.Builder(activity).setTitle("教程中心").setItems(titles) { _,which ->
            adapter.openTutorial(lessons[which].lessonId)
        }.setNegativeButton("關閉",null).show()
    }

    private fun showBanterSelector() {
        val levels=BanterLevel.entries
        val current=currentBanter()
        AlertDialog.Builder(activity).setTitle("嘴炮模式")
            .setSingleChoiceItems(levels.map { it.name }.toTypedArray(),levels.indexOf(current)) { dialog,which ->
                prefs.edit().putString("banter_level",levels[which].name).apply()
                dialog.dismiss()
            }.setNegativeButton("取消",null).show()
    }

    private fun currentBanter():BanterLevel = runCatching {
        BanterLevel.valueOf(prefs.getString("banter_level",BanterLevel.OFF.name) ?: BanterLevel.OFF.name)
    }.getOrDefault(BanterLevel.OFF)
}

object TutorialOverlayInstaller {
    private val installed=Collections.newSetFromMap(WeakHashMap<Activity,Boolean>())

    fun install(activity:Activity) {
        if(!installed.add(activity)) return
        activity.window.decorView.post {
            val root=activity.window.decorView as? ViewGroup ?: return@post
            if(root.findViewWithTag<View>("AIG_TUTORIAL_FLOAT")!=null) return@post
            val button=RgbGlowButton(activity).apply {
                tag="AIG_TUTORIAL_FLOAT"
                text="AI 教程"
                contentDescription="AI 導航 / 教程中心 / 目前頁面說明 / 嘴炮模式"
                textSize=11f
                minWidth=dp(activity,92)
                minHeight=dp(activity,42)
                setRgbState(0xFF3DEBFF.toInt(),false)
                setOnClickListener { TutorialDialogRenderer(activity,TutorialRuntimeAdapter(activity)).showEntry() }
            }
            if(root is FrameLayout) {
                root.addView(button,FrameLayout.LayoutParams(dp(activity,104),dp(activity,46),Gravity.TOP or Gravity.END).apply {
                    topMargin=dp(activity,54);marginEnd=dp(activity,116)
                })
            } else root.addView(button,ViewGroup.LayoutParams(dp(activity,104),dp(activity,46)))
        }
    }

    private fun dp(activity:Activity,value:Int):Int=(value*activity.resources.displayMetrics.density).toInt()
}
