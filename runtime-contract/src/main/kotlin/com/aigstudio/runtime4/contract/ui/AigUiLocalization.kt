package com.aigstudio.runtime4.contract.ui

object AigUiLocalization {
    val supportedLocales:Set<String> = setOf("zh-TW","en-US")

    private val zhTw=mapOf(
        "nav.home" to "首頁",
        "nav.cad" to "CAD製圖",
        "nav.cam" to "CAM加工",
        "nav.sim" to "3D走刀",
        "nav.multifunction" to "多功能",
        "nav.nc" to "NC程式",
        "nav.ai" to "AI智慧",
        "home.title" to "AIG CNC 智慧製造",
        "home.runtime" to "本機 Runtime 就緒",
        "home.machine.title" to "機台狀態",
        "home.machine.value" to "機台未連線",
        "home.project.title" to "目前專案",
        "home.project.value" to "尚無工作專案",
        "home.hero.title" to "加工預覽",
        "home.ai.title" to "AI 智慧助手",
        "home.ai.value" to "AI 本機功能可用",
        "home.quick.title" to "快速操作",
        "home.quick.cad" to "開始製圖",
        "home.quick.sim" to "3D走刀",
        "home.quick.nc" to "NC程式",
        "home.multifunction" to "多功能",
        "multifunction.pending" to "多功能工作站載入中",
    )

    private val enUs=mapOf(
        "nav.home" to "Home",
        "nav.cad" to "CAD",
        "nav.cam" to "CAM",
        "nav.sim" to "3D Toolpath",
        "nav.multifunction" to "Multifunction",
        "nav.nc" to "NC Program",
        "nav.ai" to "AI",
        "home.title" to "AIG CNC Intelligent Manufacturing",
        "home.runtime" to "Local Runtime Ready",
        "home.machine.title" to "Machine Status",
        "home.machine.value" to "Machine Disconnected",
        "home.project.title" to "Current Project",
        "home.project.value" to "No Working Project",
        "home.hero.title" to "Machining Preview",
        "home.ai.title" to "AI Assistant",
        "home.ai.value" to "Local AI Available",
        "home.quick.title" to "Quick Actions",
        "home.quick.cad" to "Start CAD",
        "home.quick.sim" to "3D Toolpath",
        "home.quick.nc" to "NC Program",
        "home.multifunction" to "Multifunction",
        "multifunction.pending" to "Multifunction Workstation Loading",
    )

    fun labels(localeId:String):Map<String,String> = when(localeId){
        "zh-TW"->zhTw
        "en-US"->enUs
        else->error("Unsupported professional UI locale: $localeId")
    }

    fun text(localeId:String,key:String):String = labels(localeId)[key] ?: key
}
