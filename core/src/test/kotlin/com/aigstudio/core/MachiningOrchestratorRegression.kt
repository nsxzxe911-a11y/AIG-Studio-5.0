package com.aigstudio.core

private fun evidence(
    page:PageId,
    revision:Long,
    verified:Boolean,
    axis:String="3AX",
    preflightReady:Boolean=false,
    fixtureCoverageKnown:Boolean=false,
)=MachiningStageEvidence(page,revision,"digest-$revision",verified,axis,preflightReady,fixtureCoverageKnown)

fun main(){
    val orchestrator=MachiningOrchestrator()

    val ncFirst=orchestrator.plan(MachiningPlanInput(
        objective=MachiningObjective.FASTEST_SAFE,
        targetAxis=PageId.AX6,
        hasNcProgram=true,
        hasCadGeometry=false,
        hasManualCamArtifact=false,
        hasCamToolpath=false,
    ))
    check(ncFirst.routeKind==MachiningRouteKind.NC_FIRST)
    check(ncFirst.stages.any{it.subpage.value=="6AX.NC_FIRST"})
    check(ncFirst.stages.any{it.subpage.value=="SIM.MATERIAL"})
    check(ncFirst.stages.any{it.subpage.value=="SIM.RESULT" && it.requiredEvidence=="SIM_PREFLIGHT_READY"})
    check(ncFirst.stages.any{it.subpage.value=="NC.VERIFY"})
    check(ncFirst.stages.last().action=="NC_MACHINE")

    val manual=orchestrator.plan(MachiningPlanInput(
        objective=MachiningObjective.FASTEST_SAFE,
        targetAxis=PageId.AX5,
        hasNcProgram=false,
        hasCadGeometry=false,
        hasManualCamArtifact=true,
        hasCamToolpath=true,
    ))
    check(manual.routeKind==MachiningRouteKind.MANUAL_CAM_FIRST)
    check(manual.stages.first().subpage.value=="CAM.MANUAL")
    check(manual.stages.any{it.subpage.value=="SIM.RESULT" && it.requiredEvidence=="SIM_PREFLIGHT_READY"})
    check(manual.stages.any{it.subpage.value=="NC.VERIFY"})

    val reuse=orchestrator.plan(MachiningPlanInput(
        objective=MachiningObjective.MIN_REWORK,
        targetAxis=PageId.AX4,
        hasNcProgram=true,
        hasCadGeometry=true,
        hasManualCamArtifact=true,
        hasCamToolpath=true,
        simEvidence=evidence(PageId.SIM,12,true,"4AX",preflightReady=true,fixtureCoverageKnown=true),
        ncEvidence=evidence(PageId.NC,20,true,"4AX"),
    ))
    check(reuse.routeKind==MachiningRouteKind.REUSE_VERIFIED_STAGE)
    check(reuse.reusedEvidence.map{it.pageId}.toSet()==setOf(PageId.SIM,PageId.NC))
    check(reuse.stages.none{it.subpage.value.startsWith("CAD.") || it.subpage.value.startsWith("CAM.")})
    check(reuse.stages.last().action=="NC_MACHINE")

    val legacyVerifiedButUnmodeled=orchestrator.plan(MachiningPlanInput(
        objective=MachiningObjective.MIN_REWORK,
        targetAxis=PageId.AX4,
        hasNcProgram=true,
        hasCadGeometry=true,
        hasManualCamArtifact=true,
        hasCamToolpath=true,
        simEvidence=evidence(PageId.SIM,13,true,"4AX"),
        ncEvidence=evidence(PageId.NC,21,true,"4AX"),
    ))
    val rejectedReuse=legacyVerifiedButUnmodeled.considered.first{it.routeKind==MachiningRouteKind.REUSE_VERIFIED_STAGE}
    check(!rejectedReuse.eligible)
    check("SIM_PREFLIGHT_READY_REQUIRED" in rejectedReuse.blockers)
    check("SIM_FIXTURE_COVERAGE_REQUIRED" in rejectedReuse.blockers)
    check(legacyVerifiedButUnmodeled.routeKind!=MachiningRouteKind.REUSE_VERIFIED_STAGE)

    val unsafeReuseMustLose=orchestrator.plan(MachiningPlanInput(
        objective=MachiningObjective.FASTEST_SAFE,
        targetAxis=PageId.AX5,
        hasNcProgram=true,
        hasCadGeometry=true,
        hasManualCamArtifact=false,
        hasCamToolpath=false,
        simEvidence=null,
        ncEvidence=evidence(PageId.NC,30,true,"5AX"),
    ))
    val unsafeReuse=unsafeReuseMustLose.considered.first{it.routeKind==MachiningRouteKind.REUSE_VERIFIED_STAGE}
    val selected=unsafeReuseMustLose.considered.first{it.routeKind==unsafeReuseMustLose.routeKind}
    check(unsafeReuse.estimatedCost<selected.estimatedCost)
    check(!unsafeReuse.eligible)
    check("SIM_VERIFIED_EVIDENCE_REQUIRED" in unsafeReuse.blockers)
    check(unsafeReuseMustLose.routeKind==MachiningRouteKind.NC_FIRST)

    val cadFirst=orchestrator.plan(MachiningPlanInput(
        objective=MachiningObjective.FASTEST_SAFE,
        targetAxis=PageId.AX3,
        hasNcProgram=false,
        hasCadGeometry=true,
        hasManualCamArtifact=false,
        hasCamToolpath=false,
    ))
    check(cadFirst.routeKind==MachiningRouteKind.CAD_FIRST)
    check(cadFirst.stages.first().pageId==PageId.CAD)
    check(cadFirst.stages.any{it.pageId==PageId.CAM})

    check(listOf(ncFirst,manual,reuse,unsafeReuseMustLose,cadFirst).all { plan ->
        plan.stages.last().action=="NC_MACHINE" &&
            (plan.routeKind==MachiningRouteKind.REUSE_VERIFIED_STAGE || plan.stages.any{it.subpage.value=="SIM.RESULT" && it.requiredEvidence=="SIM_PREFLIGHT_READY"}) &&
            (plan.routeKind==MachiningRouteKind.REUSE_VERIFIED_STAGE || plan.stages.any{it.subpage.value=="NC.VERIFY"})
    })

    println("MACHINING_ORCHESTRATOR_PASS|NC_FIRST|MANUAL_CAM_FIRST|CAD_FIRST|REUSE_STRICT_PREFLIGHT|LEGACY_UNMODELED_REUSE_REJECTED|UNSAFE_FAST_ROUTE_REJECTED|SIM_NC_REQUIRED")
}
