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
        !links.allAvailable(RuntimeLinkContract.cockpitLinks) -> "\u90E8\u5206\u65B7\u958B \u2022 \u5404\u6A21\u7D44\u7368\u7ACB\u5DE5\u4F5C\uFF1BAI \u8001\u5E2B\u53EA\u8AAA\u660E\u76EE\u524D\u53EF\u898B\u6A21\u7D44"
        links.anyDegraded(RuntimeLinkContract.cockpitLinks) -> "\u90E8\u5206\u964D\u7D1A \u2022 \u8CC7\u6599\u6D41\u4ECD\u9023\u63A5\uFF1BAI \u8001\u5E2B\u53EF\u8DE8\u6A21\u7D44\uFF0C\u4F46\u61C9\u63D0\u793A\u54C1\u8CEA\u7570\u5E38"
        else -> "\u5168\u90E8\u9023\u63A5 \u2022 AI \u8001\u5E2B\u53EF\u505A\u8DE8\u6A21\u7D44\u6559\u5B78\uFF1B\u932F\u8AA4\u4ECD\u7531\u5404\u6A21\u7D44\u81EA\u884C\u8655\u7406"
    }
}
