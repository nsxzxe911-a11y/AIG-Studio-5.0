package com.aigstudio.app.tutorial

import android.app.Activity
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import com.aigstudio.core.tutorial.TutorialPack

class TutorialRuntimeAdapter(
    val activity:Activity,
    val pack:TutorialPack=TutorialPack.loadFromReader { path ->
        runCatching { activity.assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() } }.getOrNull()
    }
) {
    fun lessonForPage(pageTarget:String):String?=pack.lessonForPage(pageTarget)

    fun openTutorial(lessonId:String) {
        TutorialDialogRenderer(activity,this).showLesson(lessonId)
    }

    fun openCurrentPageHelp(pageTarget:String=currentPageTarget()) {
        val lesson=lessonForPage(pageTarget)
        if(lesson==null) TutorialDialogRenderer(activity,this).showUnavailable(pageTarget) else openTutorial(lesson)
    }

    fun invokeActionTarget(actionTarget:String):Boolean {
        val labels=labelsFor(actionTarget)
        val target=findClickable(activity.window.decorView,labels) ?: return false
        target.post { target.performClick() }
        return true
    }

    fun currentPageTarget():String {
        val root=activity.window.decorView
        if(findVisibleDescription(root,"AIG CNC FORMAL RGB HOME")) return "HOME"
        val uxTitle=findVisibleUxTitle(root)
        return normalizePage(uxTitle ?: "HOME")
    }

    private fun labelsFor(target:String):List<String> = when(target) {
        "CAD.LINE" -> listOf("線","LINE")
        "CAM.MANUAL_PATH" -> listOf("手動刀路","MANUAL","CAM")
        "SIM.MATERIAL_REMOVAL" -> listOf("SIM","材料移除")
        "AXIS.6AX" -> listOf("6AX","6軸")
        "NC.G54" -> listOf("NC","G54")
        "SETTINGS.UPDATE" -> listOf("設定","設定中心","UPDATE")
        "WORK.PHOTO_ALIGN" -> listOf("PHOTO","照片","ALIGN")
        else -> emptyList()
    }

    private fun findClickable(view:View,labels:List<String>):View? {
        if(labels.isEmpty()) return null
        if(view.visibility==View.VISIBLE && view.isClickable) {
            val text=(view as? TextView)?.text?.toString().orEmpty()
            val description=view.contentDescription?.toString().orEmpty()
            if(labels.any { text.equals(it,true) || text.contains(it,true) || description.contains(it,true) }) return view
        }
        if(view is ViewGroup) for(i in 0 until view.childCount) findClickable(view.getChildAt(i),labels)?.let { return it }
        return null
    }

    private fun findVisibleDescription(view:View,needle:String):Boolean {
        if(view.visibility==View.VISIBLE && view.contentDescription?.toString()?.contains(needle,true)==true) return true
        if(view is ViewGroup) for(i in 0 until view.childCount) if(findVisibleDescription(view.getChildAt(i),needle)) return true
        return false
    }

    private fun findVisibleUxTitle(view:View):String? {
        if(view.visibility==View.VISIBLE && view is TextView) {
            val text=view.text?.toString().orEmpty()
            if(text.startsWith("UX •")) return text
        }
        if(view is ViewGroup) for(i in 0 until view.childCount) findVisibleUxTitle(view.getChildAt(i))?.let { return it }
        return null
    }

    private fun normalizePage(raw:String):String {
        val upper=raw.uppercase()
        return when {
            "6AX" in upper || "6軸" in raw -> "6AX"
            "5AX" in upper || "5軸" in raw -> "5AX"
            "4AX" in upper || "4軸" in raw -> "4AX"
            "3AX" in upper || "3軸" in raw -> "3AX"
            "CAM" in upper -> "CAM"
            "SIM" in upper -> "SIM"
            "NC" in upper -> "NC"
            "AI" in upper -> "AI"
            "CAD" in upper -> "CAD"
            "設定" in raw || "SETTING" in upper -> "SETTINGS"
            else -> "HOME"
        }
    }
}
