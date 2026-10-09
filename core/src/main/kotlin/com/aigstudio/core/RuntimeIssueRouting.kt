package com.aigstudio.core

enum class RuntimeIssueDomain { CAD, CAM, SIM, NC, LINK, AI }
enum class RuntimeExperienceMode { STANDARD, ADVANCED }

object RuntimeIssueRoutingPolicy {
    const val LOCAL_OWNER_ONLY=true
    const val NC_ALARM_EDITOR_ONLY=true
    const val CONNECT_DISCONNECT_IS_STATUS=true
    const val AI_TEACHER_REQUIRES_NO_DISCONNECTED=true
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

    fun aiTeacherEnabled(links:RuntimeLinkSnapshot):Boolean =
        !AI_TEACHER_REQUIRES_NO_DISCONNECTED || links.allAvailable(RuntimeLinkContract.cockpitLinks)

    fun connectionMessage(links:RuntimeLinkSnapshot):String = when {
        !links.allAvailable(RuntimeLinkContract.cockpitLinks) -> "???? ? ????????AI ???????????"
        links.anyDegraded(RuntimeLinkContract.cockpitLinks) -> "???? ? ???????????AI ??????????????"
        else -> "???? ? AI ?????????????????????"
    }
}
