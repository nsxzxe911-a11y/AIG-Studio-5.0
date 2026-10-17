package com.aigstudio.core

import kotlin.math.abs

class CamPageRuntime(
    cadSnapshot: DrawingSnapshot = DrawingSnapshot(emptyList()),
    cadRevision: Long = 0L,
) : PageRuntime {
    override val pageId: PageId = PageId.CAM
    private val localMessages=mutableListOf<PageMessage>()
    private var revision=0L
    private var sourceCadSnapshot=cadSnapshot
    private var sourceCadRevision=cadRevision
    private var lastCadBridgeRevision=-1L
    private var lastCadBridgeDigest=""
    private var settings=ManualCamPathEngine.startBlank(CamSettings())
    private var compensation="G40"
    private var regionId="ALL"
    private var lastStrategy="MANUAL"
    private var lastToolpaths:List<Toolpath> = emptyList()

    private data class CamRuntimeState(
        val revision:Long,
        val sourceCadSnapshot:DrawingSnapshot,
        val sourceCadRevision:Long,
        val lastCadBridgeRevision:Long,
        val lastCadBridgeDigest:String,
        val settings:CamSettings,
        val compensation:String,
        val regionId:String,
        val lastStrategy:String,
        val lastToolpaths:List<Toolpath>,
    )

    private fun captureState()=CamRuntimeState(
        revision,sourceCadSnapshot,sourceCadRevision,lastCadBridgeRevision,lastCadBridgeDigest,
        settings,compensation,regionId,lastStrategy,lastToolpaths.toList()
    )

    private fun restoreState(state:CamRuntimeState){
        revision=state.revision
        sourceCadSnapshot=state.sourceCadSnapshot
        sourceCadRevision=state.sourceCadRevision
        lastCadBridgeRevision=state.lastCadBridgeRevision
        lastCadBridgeDigest=state.lastCadBridgeDigest
        settings=state.settings
        compensation=state.compensation
        regionId=state.regionId
        lastStrategy=state.lastStrategy
        lastToolpaths=state.lastToolpaths
    }

    override fun dispatch(command: PageCommand): PageResult {
        val before=captureState()
        return try {
            PageCommandCatalog.validate(command)
            when(command.commandId) {
                "CAM.MANUAL.ADD_POINT" -> addManualPoint(command); "CAM.MANUAL.EDIT_POINT" -> editManualPoint(command); "CAM.MANUAL.DELETE_POINT" -> deleteManualPoint(command)
                "CAM.MANUAL.SET_MOTION_G0" -> setMotion(command,true); "CAM.MANUAL.SET_MOTION_G1" -> setMotion(command,false); "CAM.MANUAL.SET_SAFE_Z" -> setSafeZ(command)
                "CAM.MAIN.COMP_G41" -> setCompensation(command,"G41"); "CAM.MAIN.COMP_G42" -> setCompensation(command,"G42")
                "CAM.TOOL.SELECT" -> selectTool(command); "CAM.REGION.SELECT" -> selectRegion(command); "CAM.POST_PREVIEW.GENERATE" -> generatePreview(command)
                "CAM.AUTO.GENERATE" -> generateAuto(command,"GENERATE"); "CAM.AUTO.ROUGH" -> generateAuto(command,"ROUGH"); "CAM.AUTO.FINISH" -> generateAuto(command,"FINISH"); "CAM.AUTO.CONTOUR" -> generateAuto(command,"CONTOUR"); "CAM.AUTO.DRILL" -> generateAuto(command,"DRILL")
                else -> error("CAM command not implemented: ${command.commandId}")
            }
        } catch(t:Throwable) {
            restoreState(before)
            reject(command,t.message ?: t::class.simpleName.orEmpty())
        }
    }

    override fun snapshot(): PageSnapshot = PageSnapshot(pageId,revision,mapOf(
        "mode" to settings.pathMode.name,"manualPointCount" to settings.manualPath.size.toString(),
        "toolDiameter" to settings.toolDiameter.toString(),"feedMmMin" to settings.feedMmMin.toString(),"depth" to settings.depth.toString(),"safeZ" to settings.safeZ.toString(),
        "compensation" to compensation,"regionId" to regionId,"sourceCadRevision" to sourceCadRevision.toString(),
        "lastCadBridgeRevision" to lastCadBridgeRevision.toString(),"lastCadBridgeDigest" to lastCadBridgeDigest,
        "toolpathCount" to lastToolpaths.size.toString(),"moveCount" to lastToolpaths.sumOf{it.moves.size}.toString(),"lastStrategy" to lastStrategy
    ))

    fun manualPoints():List<ManualCamPoint> = settings.manualPath.toList()
    fun toolpaths():List<Toolpath> = lastToolpaths.toList()
    fun camSettings():CamSettings = settings
    fun cadSourceSnapshot():DrawingSnapshot = sourceCadSnapshot

    fun setCadSnapshot(snapshot:DrawingSnapshot,revision:Long) {
        sourceCadSnapshot=snapshot; sourceCadRevision=revision; this.revision++
    }

    override fun messages(): List<PageMessage> = localMessages.toList()

    override fun exportPayload(target: RuntimeLinkId): RuntimeBridgePayload? =
        if(RuntimeBridgeContract.canonical(target)==RuntimeLinkId.CAM_SIM)
            RuntimeBridgeContract.payload(RuntimeLinkId.CAM_SIM,revision,
                CamBridgeCodec.encode(sourceCadSnapshot,settings,compensation,regionId))
        else null

    override fun importPayload(source: RuntimeLinkId, payload: RuntimeBridgePayload): PageResult {
        if(RuntimeBridgeContract.canonical(source)!=RuntimeLinkId.CAD_CAM)
            return PageResult.Rejected(pageId,"CAM_BRIDGE_SOURCE_UNSUPPORTED",revision)
        return when(val validation=RuntimeBridgeContract.validate(RuntimeLinkId.CAD_CAM,payload,lastCadBridgeRevision)){
            is RuntimeBridgeValidation.Rejected -> PageResult.Rejected(pageId,validation.code,revision,validation.detail)
            RuntimeBridgeValidation.Accepted -> try {
                val incoming=CadBridgeCodec.decode(payload.body["cadData"] ?: error("CAD_CAM missing cadData"))
                sourceCadSnapshot=incoming
                sourceCadRevision=payload.revision
                lastCadBridgeRevision=payload.revision
                lastCadBridgeDigest=payload.digest
                if(settings.pathMode==CamPathMode.AUTO) lastToolpaths=emptyList()
                revision++
                PageResult.Accepted(pageId,"CAD_CAM_IMPORT",revision,mapOf(
                    "sourceCadRevision" to sourceCadRevision.toString(),"entityCount" to incoming.entities.size.toString()
                ))
            } catch(t:Throwable){ PageResult.Rejected(pageId,"CAD_CAM_IMPORT_INVALID",revision,t.message.orEmpty()) }
        }
    }

    private fun ensureManual(){ settings=if(settings.manualPath.size>=2) settings.copy(pathMode=CamPathMode.MANUAL) else ManualCamPathEngine.startBlank(settings) }
    private fun blankManual():Boolean { if(settings.manualPath.size!=2)return false;val a=settings.manualPath[0];val b=settings.manualPath[1];return a.rapid&&b.rapid&&a.x==b.x&&a.y==b.y&&a.z==b.z }
    private fun addManualPoint(command:PageCommand):PageResult { ensureManual();val p=point(command);settings=if(blankManual())ManualCamPathEngine.replacePoint(settings,1,p.x,p.y,p.z,p.rapid,p.axisA,p.axisB,p.axisC) else ManualCamPathEngine.insertPoint(settings,settings.manualPath.size,p);lastToolpaths=emptyList();lastStrategy="MANUAL";revision++;return accepted(command,mapOf("manualPointCount" to settings.manualPath.size.toString(),"mode" to "MANUAL")) }
    private fun editManualPoint(command:PageCommand):PageResult { ensureManual();val i=int(command,"index");val old=settings.manualPath.getOrNull(i)?:error("Manual CAM point index out of range");settings=ManualCamPathEngine.replacePoint(settings,i,number(command,"x",old.x),number(command,"y",old.y),number(command,"z",old.z),bool(command,"rapid",old.rapid),optionalNumber(command,"a"),optionalNumber(command,"b"),optionalNumber(command,"c"));lastToolpaths=emptyList();lastStrategy="MANUAL";revision++;return accepted(command,mapOf("editedIndex" to i.toString())) }
    private fun deleteManualPoint(command:PageCommand):PageResult { ensureManual();settings=ManualCamPathEngine.deletePoint(settings,int(command,"index"));lastToolpaths=emptyList();lastStrategy="MANUAL";revision++;return accepted(command,mapOf("manualPointCount" to settings.manualPath.size.toString())) }
    private fun setMotion(command:PageCommand,rapid:Boolean):PageResult { ensureManual();val i=int(command,"index");val old=settings.manualPath.getOrNull(i)?:error("Manual CAM point index out of range");val z=if(rapid)number(command,"z",settings.safeZ) else number(command,"z",settings.depth);settings=ManualCamPathEngine.replacePoint(settings,i,old.x,old.y,z,rapid);lastToolpaths=emptyList();lastStrategy="MANUAL";revision++;return accepted(command,mapOf("index" to i.toString(),"motion" to if(rapid)"G0" else "G1","z" to z.toString())) }
    private fun setSafeZ(command:PageCommand):PageResult { val z=number(command,"z");require(z>0.0);settings=settings.copy(safeZ=z,manualPath=settings.manualPath.map{p->if(p.rapid&&p.z<z)p.copy(z=z) else p});lastToolpaths=emptyList();revision++;return accepted(command,mapOf("safeZ" to z.toString())) }
    private fun setCompensation(command:PageCommand,value:String):PageResult { compensation=value;revision++;return accepted(command,mapOf("compensation" to value)) }
    private fun selectTool(command:PageCommand):PageResult { val d=number(command,"diameter",settings.toolDiameter);val f=number(command,"feed",settings.feedMmMin);val z=number(command,"depth",settings.depth);settings=settings.copy(toolDiameter=d,feedMmMin=f,depth=z);lastToolpaths=emptyList();revision++;return accepted(command,mapOf("toolDiameter" to d.toString(),"feedMmMin" to f.toString(),"depth" to z.toString())) }
    private fun selectRegion(command:PageCommand):PageResult { regionId=text(command,"regionId");require(regionId.isNotBlank());revision++;return accepted(command,mapOf("regionId" to regionId)) }
    private fun generatePreview(command:PageCommand):PageResult {
        lastToolpaths=if(settings.pathMode==CamPathMode.MANUAL)CamEngine.generateManual(settings) else if(lastToolpaths.isNotEmpty())lastToolpaths else CamEngine.generate(sourceCadSnapshot,settings)
        require(lastToolpaths.isNotEmpty())
        require(lastToolpaths.any{p->p.moves.any{!it.rapid}})
        val programNumber=command.arguments["programNumber"]?.toInt() ?: 1
        val toolNumber=command.arguments["toolNumber"]?.toInt() ?: 1
        val hNumber=command.arguments["hNumber"]?.toInt() ?: toolNumber
        val spindleRpm=command.arguments["spindleRpm"]?.toInt() ?: 2300
        val toolChangeSubprogram=optionalInt(command,"toolChangeSubprogram")
        val endSubprogram=optionalInt(command,"endSubprogram")
        val programEnd=(command.arguments["programEnd"] ?: "M99").trim().uppercase()
        val nc=FanucPostRuntime.generate(
            lastToolpaths,settings.safeZ,compensation,programNumber,toolNumber,hNumber,spindleRpm,
            toolChangeSubprogram,endSubprogram,programEnd
        )
        revision++
        return accepted(command,pathEvidence(lastStrategy)+mapOf(
            "postProfile" to FanucPostRuntime.PROFILE,
            "programNumber" to programNumber.toString(),
            "toolChangeSubprogram" to (toolChangeSubprogram?.toString() ?: ""),
            "endSubprogram" to (endSubprogram?.toString() ?: ""),
            "programEnd" to programEnd,
            "ncLineCount" to nc.lineSequence().count().toString(),
            "ncText" to nc
        ))
    }
    private fun generateAuto(command:PageCommand,strategy:String):PageResult { require(sourceCadSnapshot.entities.isNotEmpty());settings=settings.copy(pathMode=CamPathMode.AUTO);lastToolpaths=when(strategy){"DRILL"->drillPaths();"ROUGH"->roughPaths();else->CamEngine.generate(sourceCadSnapshot,settings)};require(lastToolpaths.isNotEmpty());require(lastToolpaths.any{p->p.moves.any{!it.rapid}});lastStrategy=strategy;revision++;return accepted(command,pathEvidence(strategy)) }
    private fun roughPaths():List<Toolpath> { val eligible=sourceCadSnapshot.entities.none{it.id.startsWith("HOLE:")};if(eligible){val pocket=runCatching{CamWorkflowEngine.buildCommonPocket(sourceCadSnapshot.entities,settings)}.getOrNull();if(pocket!=null)return CamEngine.generateManual(pocket)};return CamEngine.generate(sourceCadSnapshot,settings) }
    private fun drillPaths():List<Toolpath> { val holes=sourceCadSnapshot.entities.filterIsInstance<Circle>().filter{it.id.startsWith("HOLE:")};require(holes.isNotEmpty());return holes.map{h->Toolpath(listOf(Rapid(h.center,settings.safeZ),Feed(h.center,settings.feedMmMin,settings.depth),Rapid(h.center,settings.safeZ)))} }
    private fun point(command:PageCommand):ManualCamPoint { val a=number(command,"a",0.0);val b=number(command,"b",0.0);val c=number(command,"c",0.0);require(listOf(a,b,c).all{it.isFinite()&&abs(it)<=360.0});return ManualCamPoint(number(command,"x"),number(command,"y"),number(command,"z"),bool(command,"rapid",false),axisA=a,axisB=b,axisC=c) }
    private fun pathEvidence(strategy:String)=mapOf("strategy" to strategy,"toolpathCount" to lastToolpaths.size.toString(),"moveCount" to lastToolpaths.sumOf{it.moves.size}.toString(),"sourceCadRevision" to sourceCadRevision.toString(),"regionId" to regionId,"compensation" to compensation)
    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=PageResult.Accepted(pageId,command.commandId,revision,evidence)
    private fun reject(command:PageCommand,detail:String):PageResult { localMessages+=PageMessage(pageId,command.subpage.takeIf{it.page==pageId},"CAM_COMMAND_REJECTED",detail,relatedButtonId=command.commandId,revision=revision,timestampEpochMs=System.currentTimeMillis(),severity=PageMessageSeverity.WARNING);return PageResult.Rejected(pageId,"CAM_COMMAND_REJECTED",revision,detail) }
    private fun text(command:PageCommand,key:String)=command.arguments[key]?:error("Missing CAM argument: $key")
    private fun int(command:PageCommand,key:String)=text(command,key).toInt()
    private fun optionalInt(command:PageCommand,key:String)=command.arguments[key]?.toInt()
    private fun number(command:PageCommand,key:String)=text(command,key).toDouble().also{require(it.isFinite())}
    private fun number(command:PageCommand,key:String,default:Double)=command.arguments[key]?.toDouble()?.also{require(it.isFinite())}?:default
    private fun optionalNumber(command:PageCommand,key:String)=command.arguments[key]?.toDouble()?.also{require(it.isFinite())}
    private fun bool(command:PageCommand,key:String,default:Boolean)=command.arguments[key]?.toBooleanStrictOrNull()?:default
}
