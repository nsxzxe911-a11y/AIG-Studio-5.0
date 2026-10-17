package com.aigstudio.core

enum class MachiningRouteKind { CAD_FIRST, MANUAL_CAM_FIRST, NC_FIRST, REUSE_VERIFIED_STAGE }
enum class MachiningObjective { FASTEST_SAFE, MIN_REWORK, MIN_TOOL_CHANGES, OPERATOR_SELECTED }

data class MachiningStageEvidence(
    val pageId:PageId,
    val revision:Long,
    val digest:String,
    val verified:Boolean,
    val axisMode:String,
)

data class MachiningPlanStage(
    val pageId:PageId,
    val subpage:SubpageId,
    val action:String,
    val requiredEvidence:String,
)

data class MachiningRouteCandidate(
    val routeKind:MachiningRouteKind,
    val stages:List<MachiningPlanStage>,
    val eligible:Boolean,
    val estimatedCost:Int,
    val blockers:List<String>,
    val reasons:List<String>,
    val reusedEvidence:List<MachiningStageEvidence> = emptyList(),
)

data class MachiningPlanInput(
    val objective:MachiningObjective = MachiningObjective.FASTEST_SAFE,
    val targetAxis:PageId,
    val hasCadGeometry:Boolean,
    val hasManualCamArtifact:Boolean,
    val hasCamToolpath:Boolean,
    val hasNcProgram:Boolean,
    val simEvidence:MachiningStageEvidence?=null,
    val ncEvidence:MachiningStageEvidence?=null,
    val preferredRoute:MachiningRouteKind?=null,
)

data class MachiningPlan(
    val planId:String,
    val objective:MachiningObjective,
    val routeKind:MachiningRouteKind,
    val stages:List<MachiningPlanStage>,
    val estimatedCost:Int,
    val reasons:List<String>,
    val blockers:List<String>,
    val reusedEvidence:List<MachiningStageEvidence>,
    val considered:List<MachiningRouteCandidate>,
)

class MachiningOrchestrator {
    fun plan(input:MachiningPlanInput):MachiningPlan {
        require(input.targetAxis in setOf(PageId.AX3,PageId.AX4,PageId.AX5,PageId.AX6)) {
            "Machining targetAxis must be 3AX/4AX/5AX/6AX"
        }
        val candidates=listOf(
            reuseCandidate(input),
            ncFirstCandidate(input),
            manualCamCandidate(input),
            cadFirstCandidate(input),
        )
        val eligible=candidates.filter{it.eligible}
        require(eligible.isNotEmpty()){
            "No safe machining route available: "+candidates.flatMap{it.blockers}.distinct().joinToString(",")
        }
        val selected=select(input,eligible)
        require(safeMachineRoute(selected)){
            "Selected machining route violates SIM/NC safety contract"
        }
        return MachiningPlan(
            planId="PLAN-${input.targetAxis.id}-${input.objective.name}-${selected.routeKind.name}",
            objective=input.objective,
            routeKind=selected.routeKind,
            stages=selected.stages,
            estimatedCost=selected.estimatedCost,
            reasons=selected.reasons,
            blockers=selected.blockers,
            reusedEvidence=selected.reusedEvidence,
            considered=candidates,
        )
    }

    private fun select(input:MachiningPlanInput,candidates:List<MachiningRouteCandidate>):MachiningRouteCandidate {
        if(input.objective==MachiningObjective.OPERATOR_SELECTED && input.preferredRoute!=null){
            candidates.firstOrNull{it.routeKind==input.preferredRoute}?.let{return it}
        }
        return when(input.objective){
            MachiningObjective.MIN_REWORK -> candidates.minWith(compareBy<MachiningRouteCandidate>(
                { reuseRank(it.routeKind) },{ it.estimatedCost },{ it.stages.size }
            ))
            MachiningObjective.MIN_TOOL_CHANGES -> candidates.minWith(compareBy<MachiningRouteCandidate>(
                { transformationCount(it) },{ it.estimatedCost },{ it.stages.size }
            ))
            MachiningObjective.FASTEST_SAFE, MachiningObjective.OPERATOR_SELECTED ->
                candidates.minWith(compareBy<MachiningRouteCandidate>({it.estimatedCost},{it.stages.size},{it.routeKind.name}))
        }
    }

    private fun reuseCandidate(input:MachiningPlanInput):MachiningRouteCandidate {
        val reused=listOfNotNull(input.simEvidence,input.ncEvidence)
        val blockers=mutableListOf<String>()
        if(input.simEvidence?.verified!=true) blockers += "SIM_VERIFIED_EVIDENCE_REQUIRED"
        if(input.ncEvidence?.verified!=true) blockers += "NC_VERIFIED_EVIDENCE_REQUIRED"
        if(input.simEvidence?.axisMode!=input.targetAxis.id && input.simEvidence!=null) blockers += "SIM_AXIS_MISMATCH"
        if(input.ncEvidence?.axisMode!=input.targetAxis.id && input.ncEvidence!=null) blockers += "NC_AXIS_MISMATCH"
        val stages=listOf(
            stage(PageId.NC,"NC.OUTPUT","NC_OUTPUT_PREPARE","NC_VERIFIED_EVIDENCE"),
            stage(PageId.NC,"NC.OUTPUT","NC_MACHINE","NC_MACHINE_AUTHORIZATION"),
        )
        return MachiningRouteCandidate(
            routeKind=MachiningRouteKind.REUSE_VERIFIED_STAGE,
            stages=stages,
            eligible=blockers.isEmpty(),
            estimatedCost=8,
            blockers=blockers,
            reasons=listOf("Reuse verified SIM and NC evidence","Skip already verified authoring and simulation stages"),
            reusedEvidence=reused,
        )
    }

    private fun ncFirstCandidate(input:MachiningPlanInput):MachiningRouteCandidate {
        val blockers=mutableListOf<String>()
        if(!input.hasNcProgram) blockers += "NC_PROGRAM_REQUIRED"
        val axisNcFirst="${input.targetAxis.id}.NC_FIRST"
        val stages=listOf(
            stage(PageId.NC,"NC.EDITOR","NC_EDIT","NC_WORKING_COPY"),
            stage(PageId.NC,"NC.PARSER","NC_PARSE","PARSER_PASS"),
            stage(input.targetAxis,axisNcFirst,"AXIS_NC_FIRST_PREVIEW","AXIS_PRECHECK_PASS"),
            stage(PageId.SIM,"SIM.MATERIAL","SIM_MATERIAL_REMOVAL","REMOVED_VOLUME_EVIDENCE"),
            stage(PageId.SIM,"SIM.COLLISION","SIM_COLLISION_CHECK","COLLISION_EVIDENCE"),
            stage(PageId.SIM,"SIM.RESULT","SIM_ACCEPT","SIM_VERIFIED_EVIDENCE"),
            stage(PageId.NC,"NC.VERIFY","NC_VERIFY","NC_VERIFIED_EVIDENCE"),
            stage(PageId.NC,"NC.OUTPUT","NC_OUTPUT_PREPARE","NC_OUTPUT_READY"),
            stage(PageId.NC,"NC.OUTPUT","NC_MACHINE","NC_MACHINE_AUTHORIZATION"),
        )
        return candidate(MachiningRouteKind.NC_FIRST,stages,30,blockers,
            listOf("Existing NC program avoids CAD/CAM authoring","SIM and NC verification remain mandatory"))
    }

    private fun manualCamCandidate(input:MachiningPlanInput):MachiningRouteCandidate {
        val blockers=mutableListOf<String>()
        if(!input.hasManualCamArtifact && !input.hasCamToolpath) blockers += "MANUAL_CAM_ARTIFACT_REQUIRED"
        val stages=listOf(
            stage(PageId.CAM,"CAM.MANUAL","CAM_MANUAL_EDIT","MANUAL_TOOLPATH"),
            stage(PageId.CAM,"CAM.POST_PREVIEW","CAM_POST_PREVIEW","CAM_TOOLPATH_EVIDENCE"),
            stage(PageId.SIM,"SIM.MATERIAL","SIM_MATERIAL_REMOVAL","REMOVED_VOLUME_EVIDENCE"),
            stage(PageId.SIM,"SIM.COLLISION","SIM_COLLISION_CHECK","COLLISION_EVIDENCE"),
            stage(PageId.SIM,"SIM.RESULT","SIM_ACCEPT","SIM_VERIFIED_EVIDENCE"),
            stage(PageId.NC,"NC.PARSER","NC_PARSE","PARSER_PASS"),
            stage(PageId.NC,"NC.VERIFY","NC_VERIFY","NC_VERIFIED_EVIDENCE"),
            stage(PageId.NC,"NC.OUTPUT","NC_OUTPUT_PREPARE","NC_OUTPUT_READY"),
            stage(PageId.NC,"NC.OUTPUT","NC_MACHINE","NC_MACHINE_AUTHORIZATION"),
        )
        return candidate(MachiningRouteKind.MANUAL_CAM_FIRST,stages,42,blockers,
            listOf("Manual CAM starts without CAD geometry","SIM and NC verification remain mandatory"))
    }

    private fun cadFirstCandidate(input:MachiningPlanInput):MachiningRouteCandidate {
        val blockers=mutableListOf<String>()
        if(!input.hasCadGeometry) blockers += "CAD_GEOMETRY_REQUIRED"
        val stages=listOf(
            stage(PageId.CAD,"CAD.MAIN","CAD_GEOMETRY_READY","CAD_GEOMETRY_REVISION"),
            stage(PageId.CAM,"CAM.AUTO","CAM_AUTO_GENERATE","CAM_TOOLPATH_EVIDENCE"),
            stage(PageId.SIM,"SIM.MATERIAL","SIM_MATERIAL_REMOVAL","REMOVED_VOLUME_EVIDENCE"),
            stage(PageId.SIM,"SIM.COLLISION","SIM_COLLISION_CHECK","COLLISION_EVIDENCE"),
            stage(PageId.SIM,"SIM.RESULT","SIM_ACCEPT","SIM_VERIFIED_EVIDENCE"),
            stage(PageId.NC,"NC.PARSER","NC_PARSE","PARSER_PASS"),
            stage(PageId.NC,"NC.VERIFY","NC_VERIFY","NC_VERIFIED_EVIDENCE"),
            stage(PageId.NC,"NC.OUTPUT","NC_OUTPUT_PREPARE","NC_OUTPUT_READY"),
            stage(PageId.NC,"NC.OUTPUT","NC_MACHINE","NC_MACHINE_AUTHORIZATION"),
        )
        return candidate(MachiningRouteKind.CAD_FIRST,stages,60,blockers,
            listOf("Generate CAM from available CAD geometry","Full CAD to CAM to SIM to NC chain"))
    }

    private fun candidate(
        kind:MachiningRouteKind,
        stages:List<MachiningPlanStage>,
        cost:Int,
        blockers:List<String>,
        reasons:List<String>,
    ):MachiningRouteCandidate {
        val safetyBlockers=if(safeStageSequence(stages)) emptyList() else listOf("SIM_NC_SAFETY_SEQUENCE_REQUIRED")
        val allBlockers=(blockers+safetyBlockers).distinct()
        return MachiningRouteCandidate(kind,stages,allBlockers.isEmpty(),cost,allBlockers,reasons)
    }

    private fun safeMachineRoute(candidate:MachiningRouteCandidate):Boolean =
        if(candidate.routeKind==MachiningRouteKind.REUSE_VERIFIED_STAGE)
            candidate.eligible && candidate.reusedEvidence.any{it.pageId==PageId.SIM && it.verified} &&
                candidate.reusedEvidence.any{it.pageId==PageId.NC && it.verified} &&
                candidate.stages.lastOrNull()?.action=="NC_MACHINE"
        else safeStageSequence(candidate.stages)

    private fun safeStageSequence(stages:List<MachiningPlanStage>):Boolean {
        val sim=stages.indexOfFirst{it.subpage.value=="SIM.RESULT"}
        val verify=stages.indexOfFirst{it.subpage.value=="NC.VERIFY"}
        val machine=stages.indexOfLast{it.action=="NC_MACHINE"}
        return sim>=0 && verify>sim && machine>verify
    }

    private fun stage(page:PageId,subpage:String,action:String,evidence:String)=
        MachiningPlanStage(page,PageCatalog.requireSubpage(subpage),action,evidence)

    private fun reuseRank(kind:MachiningRouteKind)=when(kind){
        MachiningRouteKind.REUSE_VERIFIED_STAGE->0;MachiningRouteKind.NC_FIRST->1;MachiningRouteKind.MANUAL_CAM_FIRST->2;MachiningRouteKind.CAD_FIRST->3
    }
    private fun transformationCount(candidate:MachiningRouteCandidate)=candidate.stages.count{it.pageId==PageId.CAD || it.pageId==PageId.CAM}
}
