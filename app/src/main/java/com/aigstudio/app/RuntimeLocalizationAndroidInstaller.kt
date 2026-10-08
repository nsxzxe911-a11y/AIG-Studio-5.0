package com.aigstudio.app

import android.app.Activity
import android.graphics.Typeface
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import com.aigstudio.core.UiPresentationState
import java.util.Locale

/**
 * Presentation-only localization/typography binder. It never replaces click
 * listeners, callbacks, scene state, toolpaths, NC data or XYZABC truth.
 */
object RuntimeLocalizationAndroidInstaller {
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
        "PROGRAM SIMULATION" to "action.simulate", "程式模擬" to "action.simulate",
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

    fun install(activity:Activity) {
        val decor=activity.window.decorView
        decor.post { bindTree(decor) }
    }

    fun refresh(activity:Activity) {
        bindTree(activity.window.decorView)
    }

    private fun bindTree(view:View) {
        if(view is TextView) bindText(view)
        if(view is ViewGroup) for(i in 0 until view.childCount) bindTree(view.getChildAt(i))
    }

    private fun bindText(view:TextView) {
        val raw=view.text?.toString()?.trim().orEmpty()
        if(raw.isNotEmpty()) {
            val key=textToKey[raw.uppercase(Locale.US)] ?: textToKey[raw]
            if(key!=null) view.text=UiPresentationState.text(key)
        }
        val desc=view.contentDescription?.toString().orEmpty().uppercase(Locale.US)
        val ncLike=view is EditText || desc.contains("NC") || desc.contains("GCODE") || desc.contains("PROGRAM")
        view.typeface=if(ncLike) Typeface.MONOSPACE else Typeface.SANS_SERIF
    }
}
