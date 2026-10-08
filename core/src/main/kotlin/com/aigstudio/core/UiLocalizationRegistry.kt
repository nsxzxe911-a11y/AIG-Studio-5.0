package com.aigstudio.core

data class UiLocaleBundle(
    val id:String,
    val labels:Map<String,String>
)

/** Presentation text only. Never mutates callbacks, scene semantics or CNC truth. */
object UiLocalizationRegistry {
    val supportedLocales=listOf("zh-TW","en-US")

    private val zhTw=UiLocaleBundle("zh-TW", mapOf(
        "nav.home" to "首頁",
        "nav.cad" to "CAD",
        "nav.cam" to "CAM",
        "nav.sim" to "SIM",
        "nav.axis3" to "3AX",
        "nav.axis4" to "4AX",
        "nav.axis5" to "5AX",
        "nav.axis6" to "6AX",
        "nav.nc" to "NC",
        "nav.ai" to "AI",
        "machine.online" to "機台運行中",
        "machine.coordinates" to "機台座標",
        "machine.status" to "機台狀態",
        "tool.info" to "刀具資訊",
        "workpiece.info" to "工件資訊",
        "process.progress" to "加工進度",
        "process.control" to "加工控制",
        "action.cycleStart" to "循環啟動",
        "action.pause" to "暫停",
        "action.stop" to "停止",
        "action.singleBlock" to "單節執行",
        "action.reset" to "重置",
        "action.simulate" to "程式模擬",
        "action.settings" to "設定",
        "action.more" to "更多",
        "action.open" to "開啟",
        "action.save" to "儲存",
        "action.edit" to "編輯",
        "status.ready" to "就緒",
        "status.running" to "運轉中",
        "status.connected" to "已連線",
        "status.offline" to "離線",
        "status.reminder" to "提醒",
        "ai.assistant" to "AI 智慧助手",
        "settings.displayPerformance" to "顯示與效能",
        "settings.updateVersion" to "更新與版本",
        "settings.machineConnection" to "機台連線",
        "settings.network" to "網路設定",
        "settings.sync" to "同步設定",
        "settings.permissions" to "安全／權限",
        "settings.rgbAssets" to "RGB 資產管理"
    ))

    private val enUs=UiLocaleBundle("en-US", mapOf(
        "nav.home" to "HOME",
        "nav.cad" to "CAD",
        "nav.cam" to "CAM",
        "nav.sim" to "SIM",
        "nav.axis3" to "3AX",
        "nav.axis4" to "4AX",
        "nav.axis5" to "5AX",
        "nav.axis6" to "6AX",
        "nav.nc" to "NC",
        "nav.ai" to "AI",
        "machine.online" to "MACHINE ONLINE",
        "machine.coordinates" to "MACHINE COORDINATES",
        "machine.status" to "MACHINE STATUS",
        "tool.info" to "TOOL INFORMATION",
        "workpiece.info" to "WORKPIECE INFORMATION",
        "process.progress" to "MACHINING PROGRESS",
        "process.control" to "MACHINING CONTROL",
        "action.cycleStart" to "CYCLE START",
        "action.pause" to "PAUSE",
        "action.stop" to "STOP",
        "action.singleBlock" to "SINGLE BLOCK",
        "action.reset" to "RESET",
        "action.simulate" to "PROGRAM SIMULATION",
        "action.settings" to "SETTINGS",
        "action.more" to "MORE",
        "action.open" to "OPEN",
        "action.save" to "SAVE",
        "action.edit" to "EDIT",
        "status.ready" to "READY",
        "status.running" to "RUNNING",
        "status.connected" to "CONNECTED",
        "status.offline" to "OFFLINE",
        "status.reminder" to "NOTICE",
        "ai.assistant" to "AI ASSISTANT",
        "settings.displayPerformance" to "DISPLAY & PERFORMANCE",
        "settings.updateVersion" to "UPDATE & VERSION",
        "settings.machineConnection" to "MACHINE CONNECTION",
        "settings.network" to "NETWORK",
        "settings.sync" to "SYNC",
        "settings.permissions" to "SECURITY / PERMISSIONS",
        "settings.rgbAssets" to "RGB ASSET MANAGEMENT"
    ))

    private val bundles=mapOf(zhTw.id to zhTw,enUs.id to enUs)

    fun requireLocale(id:String):UiLocaleBundle = bundles[id] ?: error("Unsupported locale: $id")
    fun text(localeId:String,key:String):String = requireLocale(localeId).labels[key] ?: key
}
