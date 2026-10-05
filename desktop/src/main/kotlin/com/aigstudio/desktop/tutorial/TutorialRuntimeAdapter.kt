package com.aigstudio.desktop.tutorial

import com.aigstudio.core.tutorial.TutorialPack
import java.awt.Component
import java.awt.Container
import java.awt.KeyboardFocusManager
import java.awt.Window
import javax.swing.AbstractButton
import javax.swing.JTabbedPane
import javax.swing.SwingUtilities

class TutorialRuntimeAdapter(
    private val windowProvider:()->Window?={ KeyboardFocusManager.getCurrentKeyboardFocusManager().activeWindow },
    val pack:TutorialPack=TutorialPack.loadFromClassLoader()
) {
    fun lessonForPage(pageTarget:String):String?=pack.lessonForPage(pageTarget)
    fun openTutorial(lessonId:String){ TutorialDialogRenderer(this).showLesson(lessonId,windowProvider()) }
    fun openCurrentPageHelp(pageTarget:String=currentPageTarget()) {
        val lesson=lessonForPage(pageTarget)
        if(lesson==null) TutorialDialogRenderer(this).showUnavailable(pageTarget,windowProvider()) else openTutorial(lesson)
    }

    fun invokeActionTarget(actionTarget:String):Boolean {
        val owner=windowProvider() ?: return false
        val labels=labelsFor(actionTarget)
        val button=findButton(owner,labels) ?: return false
        SwingUtilities.invokeLater { button.doClick() }
        return true
    }

    fun currentPageTarget():String {
        val owner=windowProvider() ?: return "HOME"
        val tabs=findTabbedPane(owner) ?: return "HOME"
        return normalizePage(tabs.getTitleAt(tabs.selectedIndex))
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

    private fun findButton(component:Component,labels:List<String>):AbstractButton? {
        if(labels.isEmpty()) return null
        if(component is AbstractButton && component.isShowing) {
            val text=component.text?.trim().orEmpty()
            if(labels.any { text.equals(it,true) || text.contains(it,true) }) return component
        }
        if(component is Container) component.components.forEach { findButton(it,labels)?.let { found -> return found } }
        return null
    }

    private fun findTabbedPane(component:Component):JTabbedPane? {
        if(component is JTabbedPane && component.isShowing) return component
        if(component is Container) component.components.forEach { findTabbedPane(it)?.let { found -> return found } }
        return null
    }

    private fun normalizePage(raw:String):String {
        val text=raw.trim().uppercase()
        return when {
            "6AX" in text || "6軸" in raw -> "6AX"
            "5AX" in text || "5軸" in raw -> "5AX"
            "4AX" in text || "4軸" in raw -> "4AX"
            "3AX" in text || "3軸" in raw -> "3AX"
            "CAM" in text -> "CAM"
            "SIM" in text -> "SIM"
            "NC" in text -> "NC"
            "AI" in text -> "AI"
            "CAD" in text -> "CAD"
            "設定" in raw || "SETTING" in text -> "SETTINGS"
            else -> "HOME"
        }
    }
}
