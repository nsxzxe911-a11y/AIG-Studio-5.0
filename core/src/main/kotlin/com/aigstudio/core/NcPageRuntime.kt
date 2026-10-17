package com.aigstudio.core

class NcPageRuntime(
    private val controller:CncControllerProfile = CncControllerProfile.FANUC,
    private val machineLimits:NcMachineTravelLimits = NcMachineTravelLimits(),
) : PageRuntime {
    override val pageId:PageId=PageId.NC
    private val localMessages=mutableListOf<PageMessage>()
    private val installedCustomMCodes=linkedSetOf<String>()
    private val machineInterlock=NcMachineInterlockSession(machineLimits)
    private var revision=0L
    private var lastSimBridgeRevision=-1L
    private var lastSimBridgeDigest=""
    private var upstreamSimVerified=false
    private var program=""
    private var blockSkip=false
    private var singleBlock=false
    private var dryRun=false
    private var parsed=false
    private var previewed=false
    private var verified=false
    private var prepared=false
    private var machineConnected=false
    private var lastAlarm:NcEditorAlarm?=null

    override fun dispatch(command:PageCommand):PageResult {
        val before=snapshot()
        return try {
            PageCommandCatalog.validate(command)
            when(command.commandId){
                "NC.EDITOR.INSERT" -> insert(command); "NC.EDITOR.DELETE" -> delete(command); "NC.EDITOR.BLOCK_SKIP" -> setBlockSkip(command); "NC.EDITOR.CUSTOM_M_CODE" -> addCustomMCode(command)
                "NC.PARSER.PARSE" -> parse(command); "NC.PREVIEW.RENDER" -> preview(command); "NC.VERIFY.RUN" -> verify(command)
                "NC.VERIFY.SINGLE_BLOCK" -> setSingleBlock(command); "NC.VERIFY.DRY_RUN" -> setDryRun(command)
                "NC.OUTPUT.PREPARE" -> prepareOutput(command); "NC.OUTPUT.SEND_MACHINE" -> sendMachine(command)
                else -> error("NC command not implemented: ${command.commandId}")
            }
        } catch(t:Throwable){ restoreState(before);reject(command,t.message ?: t::class.simpleName.orEmpty()) }
    }

    override fun snapshot():PageSnapshot = PageSnapshot(pageId,revision,mapOf(
        "lineCount" to lineCount().toString(),"blockSkip" to blockSkip.toString(),"singleBlock" to singleBlock.toString(),"dryRun" to dryRun.toString(),
        "parsed" to parsed.toString(),"previewed" to previewed.toString(),"verified" to verified.toString(),"prepared" to prepared.toString(),
        "machineConnected" to machineConnected.toString(),"machineEligible" to (verified && prepared).toString(),
        "cAxisCompatible" to NcSixAxisCompatibility.cFindings(program).isEmpty().toString(),
        "customMCodes" to installedCustomMCodes.sorted().joinToString(","),"alarmCode" to (lastAlarm?.code ?: ""),"alarmLine" to (lastAlarm?.lineNumber?.toString() ?: ""),
        "upstreamSimVerified" to upstreamSimVerified.toString(),"lastSimBridgeRevision" to lastSimBridgeRevision.toString(),"lastSimBridgeDigest" to lastSimBridgeDigest
    ))

    fun ncText():String=program
    fun customMCodes():Set<String> = installedCustomMCodes.toSet()
    fun setMachineConnected(connected:Boolean){machineConnected=connected;revision++}

    override fun messages():List<PageMessage> = localMessages.toList()

    override fun exportPayload(target:RuntimeLinkId):RuntimeBridgePayload? {
        if(RuntimeBridgeContract.canonical(target)!=RuntimeLinkId.NC_MACHINE) return null
        if(!verified || !prepared) return null
        return RuntimeBridgeContract.payload(RuntimeLinkId.NC_MACHINE,revision,mapOf(
            "program" to program,
            "verified" to "true",
            "prepared" to "true",
            "singleBlock" to singleBlock.toString(),
            "dryRun" to dryRun.toString(),
            "blockSkip" to blockSkip.toString(),
            "upstreamSimVerified" to upstreamSimVerified.toString()
        ))
    }

    override fun importPayload(source:RuntimeLinkId,payload:RuntimeBridgePayload):PageResult {
        if(RuntimeBridgeContract.canonical(source)!=RuntimeLinkId.SIM_NC)
            return PageResult.Rejected(pageId,"NC_BRIDGE_SOURCE_UNSUPPORTED",revision)
        return when(val validation=RuntimeBridgeContract.validate(RuntimeLinkId.SIM_NC,payload,lastSimBridgeRevision)){
            is RuntimeBridgeValidation.Rejected -> PageResult.Rejected(pageId,validation.code,revision,validation.detail)
            RuntimeBridgeValidation.Accepted -> {
                val verifiedFlag=payload.body["verified"]?.toBooleanStrictOrNull()==true
                val preflightReady=payload.body["preflightReady"]?.toBooleanStrictOrNull()==true
                val collisions=payload.body["collisionCount"]?.toIntOrNull() ?: Int.MAX_VALUE
                val overcuts=payload.body["overcutCount"]?.toIntOrNull() ?: Int.MAX_VALUE
                val coverage=payload.body["fixtureCoverage"].orEmpty()
                if(!verifiedFlag || !preflightReady || collisions!=0 || overcuts!=0 || coverage!="MODELED")
                    PageResult.Rejected(pageId,"SIM_NC_EVIDENCE_BLOCKED",revision,"SIM evidence is not formally safe for NC")
                else {
                    lastSimBridgeRevision=payload.revision
                    lastSimBridgeDigest=payload.digest
                    upstreamSimVerified=true
                    revision++
                    PageResult.Accepted(pageId,"SIM_NC_IMPORT",revision,mapOf(
                        "upstreamSimVerified" to "true","sourceSimRevision" to payload.revision.toString(),
                        "fixtureCoverage" to coverage,
                        "removedVolumeMm3" to payload.body["removedVolumeMm3"].orEmpty()
                    ))
                }
            }
        }
    }

    private fun insert(command:PageCommand):PageResult {
        val text=command.arguments["text"] ?: error("NC INSERT requires text")
        require(text.isNotEmpty()){"NC INSERT text must not be empty"}
        val requestedLine=command.arguments["line"]?.toIntOrNull()
        program=if(requestedLine==null){ if(program.isBlank()) text else program.trimEnd()+"\n"+text } else {
            val lines=program.split("\n").toMutableList().let{if(it.size==1 && it[0].isEmpty()) mutableListOf() else it}
            require(requestedLine in 1..lines.size+1){"NC INSERT line out of range"};lines.add(requestedLine-1,text);lines.joinToString("\n")
        }
        invalidateVerification();revision++;return accepted(command,mapOf("lineCount" to lineCount().toString()))
    }
    private fun delete(command:PageCommand):PageResult { val line=command.arguments["line"]?.toIntOrNull() ?: error("NC DELETE requires line");val lines=program.split("\n").toMutableList();require(line in 1..lines.size){"NC DELETE line out of range"};lines.removeAt(line-1);program=lines.joinToString("\n");invalidateVerification();revision++;return accepted(command,mapOf("lineCount" to lineCount().toString())) }
    private fun setBlockSkip(command:PageCommand):PageResult { blockSkip=boolean(command,"enabled");revision++;return accepted(command,mapOf("blockSkip" to blockSkip.toString())) }
    private fun addCustomMCode(command:PageCommand):PageResult { val code=(command.arguments["code"] ?: error("Custom M-code requires code")).trim().uppercase();require(Regex("""M\d{1,3}""").matches(code));installedCustomMCodes+=code;invalidateVerification();revision++;return accepted(command,mapOf("customMCode" to code,"customMCodeCount" to installedCustomMCodes.size.toString())) }

    private fun legacyProgram():String=NcSixAxisCompatibility.legacyProgram(program)
    private fun cFindings():List<NcRuntimeInterlockFinding>=NcSixAxisCompatibility.cFindings(program)
    private fun compatibilityAlarm():NcEditorAlarm?=cFindings().firstOrNull()?.let{
        NcEditorAlarm(it.lineNumber,lineAt(it.lineNumber),it.code,it.message,"修正 C 軸數值至 ±360° 且每 Block 僅一個 C 值後重新驗證")
    }

    private fun parse(command:PageCommand):PageResult {
        require(program.isNotBlank())
        val legacy=legacyProgram()
        val runtime=cFindings()+NcRuntimeInterlock.findings(legacy,machineLimits)
        val alarm=compatibilityAlarm() ?: NcEditorAlarmRouter.firstAlarm(legacy,controller,machineLimits,profile())
        if(runtime.isNotEmpty()||alarm!=null){lastAlarm=alarm?:runtime.first().let{NcEditorAlarm(it.lineNumber,lineAt(it.lineNumber),it.code,it.message,"依 LINE HELP 修正後重新驗證")};error(lastAlarm!!.compact())}
        parsed=true;previewed=false;verified=false;prepared=false;lastAlarm=null;revision++
        return accepted(command,mapOf("parserStatus" to "PASS","lineCount" to lineCount().toString(),"cAxis" to if(NcSixAxisCompatibility.hasC(program))"VALIDATED" else "NOT_USED","customMCodes" to installedCustomMCodes.sorted().joinToString(",")))
    }
    private fun preview(command:PageCommand):PageResult {
        require(parsed)
        require(cFindings().isEmpty()){"C-axis compatibility validation failed"}
        val legacy=legacyProgram()
        val timeline=NcExecutionTimeline.build(legacy,controller,machineLimits,profile())
        val blocked=timeline.firstOrNull{it.status=="BLOCKED"}
        require(blocked==null){"NC preview blocked at L${blocked?.lineNumber}"}
        previewed=true;verified=false;prepared=false;revision++
        return accepted(command,mapOf("eventCount" to timeline.size.toString(),"readyEventCount" to timeline.count{it.status=="READY"}.toString(),"cAxis" to if(NcSixAxisCompatibility.hasC(program))"VALIDATED" else "NOT_USED","summary" to NcExecutionTimeline.programSummary(legacy,controller,machineLimits,profile())))
    }
    private fun verify(command:PageCommand):PageResult {
        require(parsed)
        val c=cFindings();require(c.isEmpty()){c.first().message}
        val legacy=legacyProgram()
        val interlock=machineInterlock.inspect(legacy)
        val timeline=NcExecutionTimeline.build(legacy,controller,machineLimits,profile())
        val blocked=timeline.firstOrNull{it.status=="BLOCKED"}
        require(interlock.canExecute&&blocked==null){"NC VERIFY blocked: ${blocked?.reasons?.joinToString(",") ?: interlock.message}"}
        verified=true;prepared=false;lastAlarm=null;revision++
        return accepted(command,mapOf("verified" to "true","machineInterlock" to interlock.state.name,"eventCount" to timeline.size.toString(),"cAxis" to if(NcSixAxisCompatibility.hasC(program))"VALIDATED" else "NOT_USED","upstreamSimVerified" to upstreamSimVerified.toString()))
    }
    private fun setSingleBlock(command:PageCommand):PageResult { singleBlock=boolean(command,"enabled");revision++;return accepted(command,mapOf("singleBlock" to singleBlock.toString())) }
    private fun setDryRun(command:PageCommand):PageResult { dryRun=boolean(command,"enabled");revision++;return accepted(command,mapOf("dryRun" to dryRun.toString())) }
    private fun prepareOutput(command:PageCommand):PageResult {
        require(verified){"NC output requires successful VERIFY"}
        require(cFindings().isEmpty()){ "C-axis compatibility validation failed" }
        require(NcExecutionTimeline.build(legacyProgram(),controller,machineLimits,profile()).none{it.status=="BLOCKED"})
        prepared=true;revision++
        return accepted(command,mapOf("machineEligible" to "true","dryRun" to dryRun.toString(),"singleBlock" to singleBlock.toString(),"blockSkip" to blockSkip.toString(),"cAxis" to if(NcSixAxisCompatibility.hasC(program))"VALIDATED" else "NOT_USED","upstreamSimVerified" to upstreamSimVerified.toString()))
    }
    private fun sendMachine(command:PageCommand):PageResult { require(verified&&prepared);require(machineConnected){"NC_MACHINE is disconnected"};revision++;return accepted(command,mapOf("machineEligible" to "true","dispatch" to "AUTHORIZED_OUTPUT_READY","programLines" to lineCount().toString())) }
    private fun profile():RotaryAxisClampProfile = RotaryAxisClampProfile.configured(installedOptionalCodes=installedCustomMCodes)
    private fun invalidateVerification(){ parsed=false;previewed=false;verified=false;prepared=false;lastAlarm=null }
    private fun lineCount():Int=if(program.isBlank())0 else program.split("\n").size
    private fun lineAt(line:Int)=program.split("\n").getOrNull(line-1).orEmpty()
    private fun restoreState(snapshot:PageSnapshot){ revision=snapshot.revision;blockSkip=snapshot.state["blockSkip"].toBoolean();singleBlock=snapshot.state["singleBlock"].toBoolean();dryRun=snapshot.state["dryRun"].toBoolean();parsed=snapshot.state["parsed"].toBoolean();previewed=snapshot.state["previewed"].toBoolean();verified=snapshot.state["verified"].toBoolean();prepared=snapshot.state["prepared"].toBoolean();machineConnected=snapshot.state["machineConnected"].toBoolean();upstreamSimVerified=snapshot.state["upstreamSimVerified"].toBoolean();lastSimBridgeRevision=snapshot.state["lastSimBridgeRevision"]?.toLongOrNull()?:lastSimBridgeRevision;lastSimBridgeDigest=snapshot.state["lastSimBridgeDigest"].orEmpty() }
    private fun boolean(command:PageCommand,key:String)=command.arguments[key]?.toBooleanStrictOrNull() ?: error("$key must be true/false")
    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=PageResult.Accepted(pageId,command.commandId,revision,evidence)
    private fun reject(command:PageCommand,detail:String):PageResult { localMessages+=PageMessage(pageId,command.subpage.takeIf{it.page==pageId},if(command.commandId=="NC.PARSER.PARSE")"NC_PARSER_BLOCKED" else "NC_COMMAND_REJECTED",detail,relatedButtonId=command.commandId,revision=revision,timestampEpochMs=System.currentTimeMillis(),severity=if(command.commandId.startsWith("NC.OUTPUT")||command.commandId=="NC.PARSER.PARSE")PageMessageSeverity.BLOCKED_ACTION else PageMessageSeverity.WARNING);return PageResult.Rejected(pageId,"NC_COMMAND_REJECTED",revision,detail) }
}
