package com.aigstudio.core

/**
 * Cross-project handoff metadata.  AIG CNC remains authoritative for machining
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

    /** Ordinary findings never erase or lock the local project. */
    fun localProjectRemainsUsable():Boolean=true
}
