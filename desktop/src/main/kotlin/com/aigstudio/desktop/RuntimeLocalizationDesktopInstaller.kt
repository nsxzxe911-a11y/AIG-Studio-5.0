package com.aigstudio.desktop

import com.aigstudio.core.UiPresentationState
import java.awt.AWTEvent
import java.awt.Component
import java.awt.Container
import java.awt.Font
import java.awt.Toolkit
import java.awt.event.ContainerEvent
import javax.swing.AbstractButton
import javax.swing.JLabel
import javax.swing.SwingUtilities
import javax.swing.text.JTextComponent
import java.util.Locale

/** Presentation-only Swing binder. Never changes callbacks, scene state or CNC truth. */
object RuntimeLocalizationDesktopInstaller {
    private var installed=false
    private val textToKey=mapOf(
        "HOME" to "nav.home", "首頁" to "nav.home",
        "CAD" to "nav.cad", "CAM" to "nav.cam", "SIM" to "nav.sim",
        "3AX" to "nav.axis3", "4AX" to "nav.axis4", "5AX" to "nav.axis5", "6AX" to "nav.axis6",
        "NC" to "nav.nc", "AI" to "nav.ai",
        "MACHINE ONLINE" to "machine.online", "機台運行中" to "machine.online",
        "MACHINE COORDINATES" to "machine.coordinates", "機台座標" to "machine.coordinates",
        "MACHINE STATUS" to "machine.status", "機台狀態" to "machine.status",
        "TOOL INFORMATION" to "tool.info", "刀具資訊" to "tool.info",
        "WORKPIECE INFORMATION" to "workpiece.info", "工件資訊" to "workpiece.info",
        "MACHINING PROGRESS" to "process.progress", "加工進度" to "process.progress",
        "MACHINING CONTROL" to "process.control", "加工控制" to "process.control",
        "CYCLE START" to "action.cycleStart", "循環啟動" to "action.cycleStart",
        "PAUSE" to "action.pause", "暫停" to "action.pause",
        "STOP" to "action.stop", "停止" to "action.stop",
        "SINGLE BLOCK" to "action.singleBlock", "單節執行" to "action.singleBlock",
        "RESET" to "action.reset", "重置" to "action.reset",
        "SETTINGS" to "action.settings", "設定" to "action.settings",
        "MORE" to "action.more", "更多" to "action.more",
        "OPEN" to "action.open", "開啟" to "action.open",
        "SAVE" to "action.save", "儲存" to "action.save",
        "EDIT" to "action.edit", "編輯" to "action.edit",
        "READY" to "status.ready", "就緒" to "status.ready",
        "RUNNING" to "status.running", "運轉中" to "status.running",
        "CONNECTED" to "status.connected", "已連線" to "status.connected",
        "OFFLINE" to "status.offline", "離線" to "status.offline",
        "AI ASSISTANT" to "ai.assistant", "AI 智慧助手" to "ai.assistant"
    )

    @Synchronized fun install() {
        if(installed) return
        installed=true
        Toolkit.getDefaultToolkit().addAWTEventListener({ event ->
            if(event is ContainerEvent && event.id==ContainerEvent.COMPONENT_ADDED) bindTree(event.child)
        },AWTEvent.CONTAINER_EVENT_MASK)
        SwingUtilities.invokeLater {
            java.awt.Window.getWindows().forEach { bindTree(it) }
        }
    }

    fun refresh()=SwingUtilities.invokeLater {
        java.awt.Window.getWindows().forEach { bindTree(it) }
    }

    private fun bindTree(component:Component) {
        when(component) {
            is AbstractButton -> component.text=translated(component.text)
            is JLabel -> component.text=translated(component.text)
            is JTextComponent -> if(component.text.length<80 && !component.text.contains('\n')) component.text=translated(component.text)
        }
        val role=(component.name ?: "").uppercase(Locale.US)
        val mono=component is JTextComponent && (role.contains("NC") || role.contains("PROGRAM") || role.contains("CODE"))
        val family=if(mono) Font.MONOSPACED else Font.SANS_SERIF
        component.font=Font(family,component.font?.style ?: Font.PLAIN,component.font?.size ?: 13)
        if(component is Container) component.components.forEach(::bindTree)
    }

    private fun translated(value:String?):String {
        val raw=value?.trim().orEmpty()
        if(raw.isEmpty()) return value.orEmpty()
        val key=textToKey[raw.uppercase(Locale.US)] ?: textToKey[raw] ?: return value.orEmpty()
        return UiPresentationState.text(key)
    }
}
