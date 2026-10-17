package com.aigstudio.core

private fun aiCmd(page:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(PageId.AI,PageCatalog.requireSubpage(page),id,mapOf(*args))

fun main(){
    val ai=AiPageRuntime()
    check(ai.snapshot().state["hasPlan"]=="false")

    val build=ai.dispatch(aiCmd("AI.PLAN","AI.PLAN.BUILD",
        "objective" to "FASTEST_SAFE",
        "targetAxis" to "6AX",
        "hasNcProgram" to "true",
        "hasCadGeometry" to "false",
        "hasManualCamArtifact" to "false",
        "hasCamToolpath" to "false")) as PageResult.Accepted
    check(build.evidence["routeKind"]=="NC_FIRST")
    check(ai.snapshot().state["hasPlan"]=="true")
    check(ai.snapshot().state["routeKind"]=="NC_FIRST")

    val explain=ai.dispatch(aiCmd("AI.ASSIST","AI.ASSIST.EXPLAIN")) as PageResult.Accepted
    check(explain.evidence.getValue("explanation").contains("NC_FIRST"))
    check(explain.evidence.getValue("stageCount").toInt()>0)

    val audit=ai.dispatch(aiCmd("AI.AUDIT","AI.AUDIT.RUN")) as PageResult.Accepted
    check(audit.evidence["safe"]=="true")
    check(audit.evidence["endsAtMachine"]=="true")
    check(audit.evidence["simNcGate"]=="true")

    val optimized=ai.dispatch(aiCmd("AI.PLAN","AI.PLAN.OPTIMIZE",
        "objective" to "MIN_REWORK",
        "targetAxis" to "4AX",
        "hasNcProgram" to "true",
        "hasCadGeometry" to "true",
        "hasManualCamArtifact" to "true",
        "hasCamToolpath" to "true",
        "simVerified" to "true","simRevision" to "12","simDigest" to "sim12","simAxis" to "4AX",
        "ncVerified" to "true","ncRevision" to "20","ncDigest" to "nc20","ncAxis" to "4AX")) as PageResult.Accepted
    check(optimized.evidence["routeKind"]=="REUSE_VERIFIED_STAGE")

    val replan=ai.dispatch(aiCmd("AI.RECOVERY","AI.RECOVERY.REPLAN",
        "objective" to "FASTEST_SAFE",
        "targetAxis" to "5AX",
        "hasNcProgram" to "true",
        "hasCadGeometry" to "true",
        "hasManualCamArtifact" to "false",
        "hasCamToolpath" to "false",
        "ncVerified" to "true","ncRevision" to "30","ncDigest" to "nc30","ncAxis" to "5AX")) as PageResult.Accepted
    check(replan.evidence["routeKind"]=="NC_FIRST")
    check(replan.evidence.getValue("replanned")=="true")

    val before=ai.snapshot()
    val wrong=ai.dispatch(PageCommand(PageId.CAD,PageCatalog.requireSubpage("CAD.MAIN"),"CAD.DRAW.LINE"))
    check(wrong is PageResult.Rejected)
    check(ai.snapshot()==before)

    check(ai.exportPayload(RuntimeLinkId.CAD_CAM)==null)
    check(ai.messages().all{it.pageId==PageId.AI})

    println("AI_PAGE_RUNTIME_PASS|ASSIST|PLAN|OPTIMIZE|AUDIT|RECOVERY|ORCHESTRATOR_ONLY|NO_DOMAIN_MUTATION|LOCAL_ERROR")
}
