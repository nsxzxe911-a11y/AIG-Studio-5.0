package com.aigstudio.core

class SimPageRuntime(
    private var sourceSnapshot:DrawingSnapshot,
    private var sourceSettings:CamSettings,
    private var fixtures:List<FixtureObstacle> = emptyList(),
    private var toolAssembly:ToolAssemblyConfig = ToolAssemblyConfig(),
) : PageRuntime {
    override val pageId:PageId=PageId.SIM
    private val localMessages=mutableListOf<PageMessage>()
    private var revision=0L
    private var playback="STOPPED"
    private var frameIndex=0
    private var result:Machining3DResult?=null
    private var risk:MachiningRiskReport?=null
    private var removedVolumeMm3=0.0
    private var removedCells=0

    override fun dispatch(command:PageCommand):PageResult = try {
        PageCommandCatalog.validate(command)
        when(command.commandId){
            "SIM.MATERIAL.RUN" -> runMaterial(command)
            "SIM.COLLISION.CHECK" -> checkCollision(command)
            "SIM.MAIN.VIEW_3D" -> view3d(command)
            "SIM.RESULT.ACCEPT" -> acceptResult(command)
            "SIM.PLAYBACK.PLAY" -> play(command)
            "SIM.PLAYBACK.PAUSE" -> pause(command)
            "SIM.PLAYBACK.SINGLE_BLOCK" -> singleBlock(command)
            "SIM.PLAYBACK.STOP" -> stop(command)
            "SIM.PLAYBACK.RESET" -> reset(command)
            else -> error("SIM command not implemented: ${command.commandId}")
        }
    } catch(t:Throwable){ reject(command,t.message ?: t::class.simpleName.orEmpty()) }

    override fun snapshot():PageSnapshot = PageSnapshot(pageId,revision,mapOf(
        "playback" to playback,
        "frameIndex" to frameIndex.toString(),
        "removedCells" to removedCells.toString(),
        "removedVolumeMm3" to removedVolumeMm3.toString(),
        "collisionCount" to (risk?.collisionCount ?: 0).toString(),
        "overcutCount" to (risk?.overcutCount ?: 0).toString(),
        "fixtureCoverage" to (risk?.fixtureCoverageWord ?: "UNKNOWN"),
        "has3DResult" to (result!=null).toString(),
    ))

    fun machiningResult():Machining3DResult?=result
    fun riskReport():MachiningRiskReport?=risk

    fun setSource(snapshot:DrawingSnapshot,settings:CamSettings){
        sourceSnapshot=snapshot
        sourceSettings=settings
        invalidate()
        revision++
    }

    fun setFixtures(value:List<FixtureObstacle>,assembly:ToolAssemblyConfig=toolAssembly){
        fixtures=value.toList()
        toolAssembly=assembly
        invalidate()
        revision++
    }

    override fun messages():List<PageMessage> = localMessages.toList()
    override fun exportPayload(target:RuntimeLinkId):RuntimeBridgePayload?=null
    override fun importPayload(source:RuntimeLinkId,payload:RuntimeBridgePayload):PageResult=
        PageResult.Rejected(pageId,"SIM_IMPORT_BRIDGE_NOT_ACTIVE",revision)

    private fun ensureResult():Machining3DResult {
        result?.let{return it}
        val built=Machining3DEngine.build(
            sourceSnapshot,sourceSettings,fixtures=fixtures,toolAssembly=toolAssembly
        )
        result=built
        updateRemovalEvidence(built.removal)
        return built
    }

    private fun runMaterial(command:PageCommand):PageResult {
        val built=Machining3DEngine.build(
            sourceSnapshot,sourceSettings,fixtures=fixtures,toolAssembly=toolAssembly
        )
        result=built
        risk=null
        frameIndex=0
        playback="STOPPED"
        updateRemovalEvidence(built.removal)
        revision++
        return accepted(command,mapOf(
            "removedCells" to removedCells.toString(),
            "removedVolumeMm3" to removedVolumeMm3.toString(),
            "meshVertices" to built.mesh.vertices.size.toString(),
            "meshTriangles" to built.mesh.triangles.size.toString(),
        ))
    }

    private fun checkCollision(command:PageCommand):PageResult {
        val built=ensureResult()
        val report=MachiningRiskScanner.inspect(built.cam,built.stock,built.fixtures,built.toolAssembly)
        risk=report
        revision++
        return accepted(command,mapOf(
            "collisionCount" to report.collisionCount.toString(),
            "overcutCount" to report.overcutCount.toString(),
            "fixtureCoverage" to report.fixtureCoverageWord,
            "warningCount" to report.warnings.size.toString(),
            "ok" to report.ok.toString(),
        ))
    }

    private fun view3d(command:PageCommand):PageResult {
        val built=ensureResult()
        return accepted(command,mapOf(
            "meshVertices" to built.mesh.vertices.size.toString(),
            "meshTriangles" to built.mesh.triangles.size.toString(),
            "removedCells" to removedCells.toString(),
        ))
    }

    private fun acceptResult(command:PageCommand):PageResult {
        val built=ensureResult()
        val report=risk ?: MachiningRiskScanner.inspect(built.cam,built.stock,built.fixtures,built.toolAssembly).also{risk=it}
        require(report.ok){"SIM result blocked: collision=${report.collisionCount}, overcut=${report.overcutCount}"}
        revision++
        return accepted(command,mapOf(
            "accepted" to "true",
            "fixtureCoverage" to report.fixtureCoverageWord,
            "warningCount" to report.warnings.size.toString(),
            "removedVolumeMm3" to removedVolumeMm3.toString(),
        ))
    }

    private fun play(command:PageCommand):PageResult {
        ensureResult()
        playback="PLAYING"
        revision++
        return accepted(command,mapOf("playback" to playback))
    }

    private fun pause(command:PageCommand):PageResult {
        playback="PAUSED"
        revision++
        return accepted(command,mapOf("playback" to playback,"frameIndex" to frameIndex.toString()))
    }

    private fun stop(command:PageCommand):PageResult {
        playback="STOPPED"
        revision++
        return accepted(command,mapOf("playback" to playback,"frameIndex" to frameIndex.toString()))
    }

    private fun reset(command:PageCommand):PageResult {
        ensureResult()
        playback="STOPPED"
        frameIndex=0
        revision++
        return accepted(command,mapOf("playback" to playback,"frameIndex" to "0"))
    }

    private fun singleBlock(command:PageCommand):PageResult {
        val built=ensureResult()
        val total=built.cam.toolpaths.sumOf{it.moves.size}
        require(total>0){"SIM has no moves"}
        frameIndex=(frameIndex+1).coerceAtMost(total-1)
        val frame=ProgressiveMachining3D.frame(built,frameIndex)
        playback="PAUSED"
        removedCells=frame.removedCells
        removedVolumeMm3=volume(frame.removal)
        revision++
        return accepted(command,mapOf(
            "frameIndex" to frame.index.toString(),
            "totalFrames" to frame.total.toString(),
            "removedCells" to frame.removedCells.toString(),
            "removedVolumeMm3" to removedVolumeMm3.toString(),
        ))
    }

    private fun updateRemovalEvidence(field:RemovalField3D){
        removedCells=field.depth.count{it<0.0}
        removedVolumeMm3=volume(field)
    }

    private fun volume(field:RemovalField3D):Double {
        val dx=(field.stock.maxX-field.stock.minX)/(field.nx-1)
        val dy=(field.stock.maxY-field.stock.minY)/(field.ny-1)
        return field.depth.sumOf{depth->if(depth<0.0)-depth*dx*dy else 0.0}
    }

    private fun invalidate(){
        result=null
        risk=null
        removedCells=0
        removedVolumeMm3=0.0
        frameIndex=0
        playback="STOPPED"
    }

    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=
        PageResult.Accepted(pageId,command.commandId,revision,evidence)

    private fun reject(command:PageCommand,detail:String):PageResult {
        localMessages+=PageMessage(
            pageId,command.subpage.takeIf{it.page==pageId},"SIM_COMMAND_REJECTED",detail,
            relatedButtonId=command.commandId,revision=revision,timestampEpochMs=System.currentTimeMillis(),
            severity=PageMessageSeverity.WARNING
        )
        return PageResult.Rejected(pageId,"SIM_COMMAND_REJECTED",revision,detail)
    }
}
