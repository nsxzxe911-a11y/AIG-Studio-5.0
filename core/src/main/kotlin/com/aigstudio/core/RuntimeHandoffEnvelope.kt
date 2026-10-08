package com.aigstudio.core

/**
 * Cross-project handoff metadata. AIG CNC remains authoritative for machining
 * truth; AIG-II passes references/snapshots and requested surface only.
 */
data class RuntimeHandoffEnvelope(
    val contractVersion:Int=1,
    val projectId:String,
    val revision:Long,
    val contentDigest:String,
    val requestedSurface:String,
    val axisMode:String,
    val x:Double,val y:Double,val z:Double,
    val a:Double=0.0,val b:Double=0.0,val c:Double=0.0,
    val camDigest:String="",
    val toolpathDigest:String="",
    val ncDigest:String="",
    val machineProfileId:String="",
    val machineProfileDigest:String="",
    val controllerVersion:String="",
    val controllerSha:String="",
    val runtimeVersion:String="",
    val runtimeSha:String=""
) {
    fun normalizedSurface():String=RuntimeSurfaceVisualContract.normalize(requestedSurface)
    fun findings():List<String> = buildList {
        if(contractVersion<=0) add("HANDOFF_CONTRACT_VERSION_INVALID")
        if(projectId.isBlank()) add("PROJECT_ID_MISSING")
        if(revision<0) add("REVISION_INVALID")
        if(contentDigest.isNotBlank() && !contentDigest.matches(Regex("[a-fA-F0-9]{64}"))) add("CONTENT_DIGEST_FORMAT")
        if(axisMode.uppercase() !in setOf("3AX","4AX","5AX","6AX")) add("AXIS_MODE_UNKNOWN")
        if(listOf(x,y,z,a,b,c).any{!it.isFinite()}) add("COORDINATE_NOT_FINITE")
        if(kotlin.math.abs(a)>360.0 || kotlin.math.abs(b)>360.0 || kotlin.math.abs(c)>360.0) add("ROTARY_RANGE_REVIEW")
        if(controllerSha.isNotBlank() && !controllerSha.matches(Regex("[a-fA-F0-9]{40,64}"))) add("CONTROLLER_SHA_FORMAT")
        if(runtimeSha.isNotBlank() && !runtimeSha.matches(Regex("[a-fA-F0-9]{40,64}"))) add("RUNTIME_SHA_FORMAT")
    }

    fun localProjectRemainsUsable():Boolean=true
}

enum class RuntimeHandoffStatus {
    READY,
    PROJECT_REVIEW,
    CONTENT_DIFFERENT,
    RUNTIME_VERSION_DIFFERENT,
    RUNTIME_UNAVAILABLE
}

object RuntimeHandoffPolicy {
    const val TRANSPORT="LOCAL_PROJECT_HANDOFF"
    const val NETWORK_REQUIRED=false
    const val SILENT_OVERWRITE=false
    const val GLOBAL_RUNTIME_LOCK=false
    const val AUTO_ROLLBACK=false
    const val AUTO_DOWNGRADE=false

    fun classify(
        envelope:RuntimeHandoffEnvelope,
        localContentDigest:String?,
        expectedRuntimeSha:String?,
        runtimeAvailable:Boolean
    ):RuntimeHandoffStatus {
        if(!runtimeAvailable) return RuntimeHandoffStatus.RUNTIME_UNAVAILABLE
        if(envelope.findings().isNotEmpty()) return RuntimeHandoffStatus.PROJECT_REVIEW
        if(!localContentDigest.isNullOrBlank() && envelope.contentDigest.isNotBlank() &&
            localContentDigest!=envelope.contentDigest) return RuntimeHandoffStatus.CONTENT_DIFFERENT
        if(!expectedRuntimeSha.isNullOrBlank() && envelope.runtimeSha.isNotBlank() &&
            expectedRuntimeSha!=envelope.runtimeSha) return RuntimeHandoffStatus.RUNTIME_VERSION_DIFFERENT
        return RuntimeHandoffStatus.READY
    }

    fun messageZhTw(state:RuntimeHandoffStatus):String=when(state) {
        RuntimeHandoffStatus.READY -> "AIG 專案續接就緒"
        RuntimeHandoffStatus.PROJECT_REVIEW -> "專案資料需確認 • 本機 Runtime 可繼續使用"
        RuntimeHandoffStatus.CONTENT_DIFFERENT -> "專案內容已有變更 • 可比較 / 保留本機 / 另存副本"
        RuntimeHandoffStatus.RUNTIME_VERSION_DIFFERENT -> "Runtime 版本不同 • 可繼續本機工作並重新續接"
        RuntimeHandoffStatus.RUNTIME_UNAVAILABLE -> "AIG-II 尚未連線 • AIG CNC 可繼續本機加工工作"
    }

    fun connectivityPolicyAligned():Boolean =
        !NETWORK_REQUIRED &&
        !GLOBAL_RUNTIME_LOCK &&
        !AUTO_ROLLBACK &&
        !AUTO_DOWNGRADE &&
        AigProjectConnectivityPolicy.OFFLINE_FIRST &&
        !AigProjectConnectivityPolicy.NETWORK_REQUIRED_FOR_LOCAL_RUNTIME
}
