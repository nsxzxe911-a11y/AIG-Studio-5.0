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
    private var settings=ManualCamPathEngine.startBlank(CamSettings())
    private var compensation="G40"
    private var regionId="ALL"
    private var lastStrategy="MANUAL"
    private var lastToolpaths:List<Toolpath> = emptyList()

    override fun dispatch(command: PageCommand): PageResult {
        return try {
            PageCommandCatalog.validate(command)
            when(command.commandId) {
                "CAM.MANUAL.ADD_POINT" -> addManualPoint(command)
                "CAM.MANUAL.EDIT_POINT" -> editManualPoint(command)
                "CAM.MANUAL.DELETE_POINT" -> deleteManualPoint(command)
                "CAM.MANUAL.SET_MOTION_G0" -> setMotion(command,true)
                "CAM.MANUAL.SET_MOTION_G1" -> setMotion(command,false)
                "CAM.MANUAL.SET_SAFE_Z" -> setSafeZ(command)
                "CAM.MAIN.COMP_G41" -> setCompensation(command,"G41")
                "CAM.MAIN.COMP_G42" -> setCompensation(command,"G42")
                "CAM.TOOL.SELECT" -> selectTool(command)
                "CAM.REGION.SELECT" -> selectRegion(command)
                "CAM.POST_PREVIEW.GENERATE" -> generatePreview(command)
                "CAM.AUTO.GENERATE" -> generateAuto(command,"GENERATE")
                "CAM.AUTO.ROUGH" -> generateAuto(command,"ROUGH")
                "CAM.AUTO.FINISH" -> generateAuto(command,"FINISH")
                "CAM.AUTO.CONTOUR" -> generateAuto(command,"CONTOUR")
                "CAM.AUTO.DRILL" -> generateAuto(command,"DRILL")
                else -> error("CAM command not implemented: ${command.commandId}")
            }
        } catch(t:Throwable) {
            reject(command,t.message ?: t::class.simpleName.orEmpty())
        }
    }

    override fun snapshot(): PageSnapshot = PageSnapshot(
        pageId,revision,mapOf(
            "mode" to settings.pathMode.name,
            "manualPointCount" to settings.manualPath.size.toString(),
            "toolDiameter" to settings.toolDiameter.toString(),
            "feedMmMin" to settings.feedMmMin.toString(),
            "depth" to settings.depth.toString(),
            "safeZ" to settings.safeZ.toString(),
            "compensation" to compensation,
            "regionId" to regionId,
            "sourceCadRevision" to sourceCadRevision.toString(),
            "toolpathCount" to lastToolpaths.size.toString(),
            "moveCount" to lastToolpaths.sumOf{it.moves.size}.toString(),
            "lastStrategy" to lastStrategy,
        )
    )

    fun manualPoints():List<ManualCamPoint> = settings.manualPath.toList()
    fun toolpaths():List<Toolpath> = lastToolpaths.toList()
    fun camSettings():CamSettings = settings

    fun setCadSnapshot(snapshot:DrawingSnapshot,revision:Long) {
        sourceCadSnapshot=snapshot
        sourceCadRevision=revision
        this.revision++
    }

    override fun messages(): List<PageMessage> = localMessages.toList()

    override fun exportPayload(target: RuntimeLinkId): RuntimeBridgePayload? = null

    override fun importPayload(source: RuntimeLinkId, payload: RuntimeBridgePayload): PageResult =
        PageResult.Rejected(pageId,"CAM_IMPORT_BRIDGE_NOT_ACTIVE",revision)

    private fun ensureManual() {
        settings=if(settings.manualPath.size>=2) settings.copy(pathMode=CamPathMode.MANUAL)
        else ManualCamPathEngine.startBlank(settings)
    }

    private fun blankManual():Boolean {
        if(settings.manualPath.size!=2) return false
        val a=settings.manualPath[0]; val b=settings.manualPath[1]
        return a.rapid && b.rapid && a.x==b.x && a.y==b.y && a.z==b.z
    }

    private fun addManualPoint(command:PageCommand):PageResult {
        ensureManual()
        val p=point(command)
        settings=if(blankManual()) {
            ManualCamPathEngine.replacePoint(
                settings,1,p.x,p.y,p.z,p.rapid,p.axisA,p.axisB,p.axisC
            )
        } else {
            ManualCamPathEngine.insertPoint(settings,settings.manualPath.size,p)
        }
        lastToolpaths=emptyList()
        lastStrategy="MANUAL"
        revision++
        return accepted(command,mapOf("manualPointCount" to settings.manualPath.size.toString(),"mode" to "MANUAL"))
    }

    private fun editManualPoint(command:PageCommand):PageResult {
        ensureManual()
        val index=int(command,"index")
        val old=settings.manualPath.getOrNull(index) ?: error("Manual CAM point index out of range")
        settings=ManualCamPathEngine.replacePoint(
            settings,index,
            number(command,"x",old.x),number(command,"y",old.y),number(command,"z",old.z),
            bool(command,"rapid",old.rapid),
            optionalNumber(command,"a"),optionalNumber(command,"b"),optionalNumber(command,"c")
        )
        lastToolpaths=emptyList(); lastStrategy="MANUAL"; revision++
        return accepted(command,mapOf("editedIndex" to index.toString()))
    }

    private fun deleteManualPoint(command:PageCommand):PageResult {
        ensureManual()
        settings=ManualCamPathEngine.deletePoint(settings,int(command,"index"))
        lastToolpaths=emptyList(); lastStrategy="MANUAL"; revision++
        return accepted(command,mapOf("manualPointCount" to settings.manualPath.size.toString()))
    }

    private fun setMotion(command:PageCommand,rapid:Boolean):PageResult {
        ensureManual()
        val index=int(command,"index")
        val old=settings.manualPath.getOrNull(index) ?: error("Manual CAM point index out of range")
        val z=if(rapid) number(command,"z",settings.safeZ) else number(command,"z",settings.depth)
        settings=ManualCamPathEngine.replacePoint(settings,index,old.x,old.y,z,rapid)
        lastToolpaths=emptyList(); lastStrategy="MANUAL"; revision++
        return accepted(command,mapOf("index" to index.toString(),"motion" to if(rapid)"G0" else "G1","z" to z.toString()))
    }

    private fun setSafeZ(command:PageCommand):PageResult {
        val z=number(command,"z")
        require(z>0.0){"Safe-Z must be positive"}
        val adjusted=settings.manualPath.map { p -> if(p.rapid && p.z<z) p.copy(z=z) else p }
        settings=settings.copy(safeZ=z,manualPath=adjusted)
        lastToolpaths=emptyList(); revision++
        return accepted(command,mapOf("safeZ" to z.toString()))
    }

    private fun setCompensation(command:PageCommand,value:String):PageResult {
        compensation=value
        revision++
        return accepted(command,mapOf("compensation" to value))
    }

    private fun selectTool(command:PageCommand):PageResult {
        val diameter=number(command,"diameter",settings.toolDiameter)
        val feed=number(command,"feed",settings.feedMmMin)
        val depth=number(command,"depth",settings.depth)
        settings=settings.copy(toolDiameter=diameter,feedMmMin=feed,depth=depth)
        lastToolpaths=emptyList(); revision++
        return accepted(command,mapOf("toolDiameter" to diameter.toString(),"feedMmMin" to feed.toString(),"depth" to depth.toString()))
    }

    private fun selectRegion(command:PageCommand):PageResult {
        regionId=text(command,"regionId")
        require(regionId.isNotBlank()){"regionId must not be blank"}
        revision++
        return accepted(command,mapOf("regionId" to regionId))
    }

    private fun generatePreview(command:PageCommand):PageResult {
        lastToolpaths=if(settings.pathMode==CamPathMode.MANUAL) {
            CamEngine.generateManual(settings)
        } else if(lastToolpaths.isNotEmpty()) {
            lastToolpaths
        } else {
            CamEngine.generate(sourceCadSnapshot,settings)
        }
        require(lastToolpaths.isNotEmpty()){"No CAM toolpath available"}
        require(lastToolpaths.any{path->path.moves.any{!it.rapid}}){"CAM toolpath has no cutting move"}
        return accepted(command,pathEvidence(lastStrategy))
    }

    private fun generateAuto(command:PageCommand,strategy:String):PageResult {
        require(sourceCadSnapshot.entities.isNotEmpty()){ "AUTO CAM requires CAD geometry" }
        settings=settings.copy(pathMode=CamPathMode.AUTO)
        lastToolpaths=when(strategy) {
            "DRILL" -> drillPaths()
            "ROUGH" -> roughPaths()
            else -> CamEngine.generate(sourceCadSnapshot,settings)
        }
        require(lastToolpaths.isNotEmpty()){ "$strategy produced no toolpath" }
        require(lastToolpaths.any{path->path.moves.any{!it.rapid}}){ "$strategy produced no cutting move" }
        lastStrategy=strategy
        revision++
        return accepted(command,pathEvidence(strategy))
    }

    private fun roughPaths():List<Toolpath> {
        val eligible=sourceCadSnapshot.entities.none{it.id.startsWith("HOLE:")}
        if(eligible) {
            val pocket=runCatching { CamWorkflowEngine.buildCommonPocket(sourceCadSnapshot.entities,settings) }.getOrNull()
            if(pocket!=null) {
                settings=pocket
                return CamEngine.generateManual(settings)
            }
        }
        settings=settings.copy(pathMode=CamPathMode.AUTO)
        return CamEngine.generate(sourceCadSnapshot,settings)
    }

    private fun drillPaths():List<Toolpath> {
        val holes=sourceCadSnapshot.entities.filterIsInstance<Circle>().filter{it.id.startsWith("HOLE:")}
        require(holes.isNotEmpty()){ "DRILL requires CAD HOLE geometry" }
        return holes.map { hole ->
            Toolpath(listOf(
                Rapid(hole.center,settings.safeZ),
                Feed(hole.center,settings.feedMmMin,settings.depth),
                Rapid(hole.center,settings.safeZ),
            ))
        }
    }

    private fun point(command:PageCommand):ManualCamPoint {
        val a=number(command,"a",0.0); val b=number(command,"b",0.0); val c=number(command,"c",0.0)
        require(listOf(a,b,c).all{it.isFinite() && abs(it)<=360.0}){"Manual CAM A/B/C out of range"}
        return ManualCamPoint(
            x=number(command,"x"),y=number(command,"y"),z=number(command,"z"),
            rapid=bool(command,"rapid",false),axisA=a,axisB=b,axisC=c
        )
    }

    private fun pathEvidence(strategy:String):Map<String,String> = mapOf(
        "strategy" to strategy,
        "toolpathCount" to lastToolpaths.size.toString(),
        "moveCount" to lastToolpaths.sumOf{it.moves.size}.toString(),
        "sourceCadRevision" to sourceCadRevision.toString(),
        "regionId" to regionId,
        "compensation" to compensation,
    )

    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=
        PageResult.Accepted(pageId,command.commandId,revision,evidence)

    private fun reject(command:PageCommand,detail:String):PageResult {
        localMessages+=PageMessage(
            pageId,command.subpage.takeIf{it.page==pageId},"CAM_COMMAND_REJECTED",detail,
            relatedButtonId=command.commandId,revision=revision,timestampEpochMs=System.currentTimeMillis(),
            severity=PageMessageSeverity.WARNING
        )
        return PageResult.Rejected(pageId,"CAM_COMMAND_REJECTED",revision,detail)
    }

    private fun text(command:PageCommand,key:String):String = command.arguments[key] ?: error("Missing CAM argument: $key")
    private fun int(command:PageCommand,key:String):Int = text(command,key).toInt()
    private fun number(command:PageCommand,key:String):Double = text(command,key).toDouble().also{require(it.isFinite()){ "$key must be finite" }}
    private fun number(command:PageCommand,key:String,default:Double):Double = command.arguments[key]?.toDouble()?.also{require(it.isFinite())} ?: default
    private fun optionalNumber(command:PageCommand,key:String):Double? = command.arguments[key]?.toDouble()?.also{require(it.isFinite())}
    private fun bool(command:PageCommand,key:String,default:Boolean):Boolean = command.arguments[key]?.toBooleanStrictOrNull() ?: default
}
