package com.aigstudio.core

enum class RuntimeIssueDomain { CAD, CAM, SIM, NC, LINK, AI }
enum class RuntimeExperienceMode { STANDARD, ADVANCED }

data class RuntimeLinkState(
    val cadCam:Boolean=true,
    val camSim:Boolean=true,
    val simNc:Boolean=true
) {
    val allConnected:Boolean get() = cadCam && camSim && simNc
}

object RuntimeIssueRoutingPolicy {
    const val LOCAL_OWNER_ONLY=true
    const val NC_ALARM_EDITOR_ONLY=true
    const val CONNECT_DISCONNECT_IS_STATUS=true
    const val AI_TEACHER_REQUIRES_ALL_CONNECTED=true
    val ADVANCED_ONLY_DIAGNOSTICS=setOf("3D_STABILITY","COLLISION","INTERFERENCE","FULL_SIM_TRACE")

    fun owner(domain:RuntimeIssueDomain):String = when(domain){
        RuntimeIssueDomain.CAD -> "CAD"
        RuntimeIssueDomain.CAM -> "CAM"
        RuntimeIssueDomain.SIM -> "3D/SIM"
        RuntimeIssueDomain.NC -> "NC/G-code"
        RuntimeIssueDomain.LINK -> "CONNECT/DISCONNECT"
        RuntimeIssueDomain.AI -> "AI TEACHER"
    }

    fun showDiagnostic(name:String,mode:RuntimeExperienceMode):Boolean =
        name !in ADVANCED_ONLY_DIAGNOSTICS || mode==RuntimeExperienceMode.ADVANCED

    fun aiTeacherEnabled(links:RuntimeLinkState):Boolean =
        !AI_TEACHER_REQUIRES_ALL_CONNECTED || links.allConnected

    fun connectionMessage(links:RuntimeLinkState):String = when {
        links.allConnected -> "全部連接 • AI 老師可做跨模組教學；錯誤仍由各模組自行處理"
        else -> "部分斷開 • 各模組獨立工作；AI 老師只說明目前可見模組"
    }
}
