package com.aigstudio.core

class AiPageRuntime(
    private val orchestrator:MachiningOrchestrator = MachiningOrchestrator(),
) : PageRuntime {
    override val pageId:PageId=PageId.AI
    private val localMessages=mutableListOf<PageMessage>()
    private var revision=0L
    private var latestInput:MachiningPlanInput?=null
    private var latestPlan:MachiningPlan?=null
    private var lastAuditSafe=false

    override fun dispatch(command:PageCommand):PageResult {
        val before=snapshot()
        val beforeInput=latestInput
        val beforePlan=latestPlan
        val beforeAudit=lastAuditSafe
        return try {
            require(command.page==PageId.AI){"AI page accepts AI commands only"}
            PageCommandCatalog.validate(command)
            when(command.commandId){
                "AI.ASSIST.EXPLAIN" -> explain(command)
                "AI.PLAN.BUILD" -> buildPlan(command,false)
                "AI.PLAN.OPTIMIZE" -> buildPlan(command,false)
                "AI.AUDIT.RUN" -> audit(command)
                "AI.RECOVERY.REPLAN" -> buildPlan(command,true)
                else -> error("AI command not implemented: ${command.commandId}")
            }
        } catch(t:Throwable){
            restore(before,beforeInput,beforePlan,beforeAudit)
            reject(command,t.message ?: t::class.simpleName.orEmpty())
        }
    }

    override fun snapshot():PageSnapshot = PageSnapshot(pageId,revision,mapOf(
        "hasPlan" to (latestPlan!=null).toString(),
        "planId" to (latestPlan?.planId ?: ""),
        "routeKind" to (latestPlan?.routeKind?.name ?: ""),
        "objective" to (latestPlan?.objective?.name ?: ""),
        "estimatedCost" to (latestPlan?.estimatedCost?.toString() ?: ""),
        "stageCount" to (latestPlan?.stages?.size?.toString() ?: "0"),
        "lastAuditSafe" to lastAuditSafe.toString(),
    ))

    fun currentPlan():MachiningPlan?=latestPlan
    fun currentInput():MachiningPlanInput?=latestInput

    override fun messages():List<PageMessage> = localMessages.toList()
    override fun exportPayload(target:RuntimeLinkId):RuntimeBridgePayload?=null
    override fun importPayload(source:RuntimeLinkId,payload:RuntimeBridgePayload):PageResult=
        PageResult.Rejected(pageId,"AI_BRIDGE_IMPORT_DISABLED",revision,"Production AI coordinates public page contracts; it does not own machining payload truth")

    private fun explain(command:PageCommand):PageResult {
        val plan=latestPlan ?: error("Build a machining plan before explanation")
        val explanation=buildString {
            append(plan.routeKind.name)
            append(" selected for ").append(plan.objective.name)
            append("; cost=").append(plan.estimatedCost)
            append("; stages=").append(plan.stages.size)
            if(plan.reusedEvidence.isNotEmpty()) append("; reused=").append(plan.reusedEvidence.joinToString(","){it.pageId.id+"@r"+it.revision})
            if(plan.reasons.isNotEmpty()) append("; reason=").append(plan.reasons.joinToString(" / "))
        }
        return accepted(command,mapOf(
            "planId" to plan.planId,
            "routeKind" to plan.routeKind.name,
            "stageCount" to plan.stages.size.toString(),
            "explanation" to explanation,
        ))
    }

    private fun buildPlan(command:PageCommand,replanned:Boolean):PageResult {
        val input=parseInput(command.arguments,latestInput)
        val plan=orchestrator.plan(input)
        latestInput=input
        latestPlan=plan
        lastAuditSafe=false
        revision++
        return accepted(command,mapOf(
            "planId" to plan.planId,
            "routeKind" to plan.routeKind.name,
            "objective" to plan.objective.name,
            "estimatedCost" to plan.estimatedCost.toString(),
            "stageCount" to plan.stages.size.toString(),
            "replanned" to replanned.toString(),
            "reusedPages" to plan.reusedEvidence.joinToString(","){it.pageId.id},
        ))
    }

    private fun audit(command:PageCommand):PageResult {
        val plan=latestPlan ?: error("Build a machining plan before audit")
        val endsAtMachine=plan.stages.lastOrNull()?.action=="NC_MACHINE"
        val simNcGate=if(plan.routeKind==MachiningRouteKind.REUSE_VERIFIED_STAGE){
            plan.reusedEvidence.any{it.pageId==PageId.SIM && it.verified} &&
                plan.reusedEvidence.any{it.pageId==PageId.NC && it.verified}
        } else {
            val sim=plan.stages.indexOfFirst{it.subpage.value=="SIM.RESULT"}
            val verify=plan.stages.indexOfFirst{it.subpage.value=="NC.VERIFY"}
            val machine=plan.stages.indexOfLast{it.action=="NC_MACHINE"}
            sim>=0 && verify>sim && machine>verify
        }
        val safe=endsAtMachine && simNcGate
        lastAuditSafe=safe
        revision++
        if(!safe) error("AI plan audit failed: SIM/NC safety sequence is incomplete")
        return accepted(command,mapOf(
            "safe" to "true",
            "endsAtMachine" to endsAtMachine.toString(),
            "simNcGate" to simNcGate.toString(),
            "routeKind" to plan.routeKind.name,
        ))
    }

    private fun parseInput(args:Map<String,String>,fallback:MachiningPlanInput?):MachiningPlanInput {
        val targetAxis=parseAxis(args["targetAxis"] ?: fallback?.targetAxis?.id ?: error("AI plan requires targetAxis"))
        val objective=MachiningObjective.valueOf((args["objective"] ?: fallback?.objective?.name ?: MachiningObjective.FASTEST_SAFE.name).uppercase())
        val preferred=args["preferredRoute"]?.uppercase()?.let(MachiningRouteKind::valueOf) ?: fallback?.preferredRoute
        return MachiningPlanInput(
            objective=objective,
            targetAxis=targetAxis,
            hasCadGeometry=bool(args,"hasCadGeometry",fallback?.hasCadGeometry ?: false),
            hasManualCamArtifact=bool(args,"hasManualCamArtifact",fallback?.hasManualCamArtifact ?: false),
            hasCamToolpath=bool(args,"hasCamToolpath",fallback?.hasCamToolpath ?: false),
            hasNcProgram=bool(args,"hasNcProgram",fallback?.hasNcProgram ?: false),
            simEvidence=parseEvidence(args,"sim",PageId.SIM,targetAxis.id) ?: fallback?.simEvidence,
            ncEvidence=parseEvidence(args,"nc",PageId.NC,targetAxis.id) ?: fallback?.ncEvidence,
            preferredRoute=preferred,
        )
    }

    private fun parseEvidence(
        args:Map<String,String>,
        prefix:String,
        page:PageId,
        defaultAxis:String,
    ):MachiningStageEvidence? {
        val verified=args["${prefix}Verified"]?.toBooleanStrictOrNull() ?: return null
        val revision=args["${prefix}Revision"]?.toLongOrNull() ?: 0L
        require(revision>=0L){"$prefix evidence revision must be non-negative"}
        return MachiningStageEvidence(
            pageId=page,
            revision=revision,
            digest=args["${prefix}Digest"].orEmpty(),
            verified=verified,
            axisMode=args["${prefix}Axis"] ?: defaultAxis,
        )
    }

    private fun parseAxis(value:String):PageId = when(value.uppercase()){
        "3AX"->PageId.AX3;"4AX"->PageId.AX4;"5AX"->PageId.AX5;"6AX"->PageId.AX6
        else->error("Unsupported AI machining axis: $value")
    }

    private fun bool(args:Map<String,String>,key:String,default:Boolean):Boolean =
        args[key]?.toBooleanStrictOrNull() ?: default

    private fun restore(
        snapshot:PageSnapshot,
        input:MachiningPlanInput?,
        plan:MachiningPlan?,
        audit:Boolean,
    ){
        revision=snapshot.revision
        latestInput=input
        latestPlan=plan
        lastAuditSafe=audit
    }

    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=
        PageResult.Accepted(pageId,command.commandId,revision,evidence)

    private fun reject(command:PageCommand,detail:String):PageResult {
        localMessages+=PageMessage(
            pageId,
            command.subpage.takeIf{it.page==pageId},
            "AI_COMMAND_REJECTED",
            detail,
            relatedButtonId=command.commandId,
            revision=revision,
            timestampEpochMs=System.currentTimeMillis(),
            severity=PageMessageSeverity.WARNING,
        )
        return PageResult.Rejected(pageId,"AI_COMMAND_REJECTED",revision,detail)
    }
}
