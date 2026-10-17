package com.aigstudio.core

class AxisPageRuntime(
    override val pageId:PageId,
) : PageRuntime {
    init {
        require(pageId in setOf(PageId.AX3,PageId.AX4,PageId.AX5,PageId.AX6)) {
            "AxisPageRuntime requires 3AX/4AX/5AX/6AX page"
        }
    }

    private val localMessages=mutableListOf<PageMessage>()
    private val positions=linkedMapOf(
        'X' to 0.0,'Y' to 0.0,'Z' to 0.0,
        'A' to 0.0,'B' to 0.0,'C' to 0.0,
    )
    private var revision=0L
    private var viewPreset=AxisCockpitSkinContract.DEFAULT_PRESET
    private var ncProgram=""
    private var ncFirstStage="EMPTY"
    private var ncBlocks=0
    private var ncAxisWords=0
    private var ncParsed=false
    private var ncPreview:NcFirstMachiningPreview?=null
    private var ncFixtures:List<FixtureObstacle> = emptyList()
    private var ncToolAssembly:ToolAssemblyConfig = ToolAssemblyConfig()

    private val allowedAxes:Set<Char> = when(pageId) {
        PageId.AX3 -> setOf('X','Y','Z')
        PageId.AX4 -> setOf('X','Y','Z','A')
        PageId.AX5 -> setOf('X','Y','Z','A','B')
        PageId.AX6 -> setOf('X','Y','Z','A','B','C')
        else -> error("Unsupported axis page")
    }

    override fun dispatch(command:PageCommand):PageResult {
        val beforePositions=positions.toMap()
        val beforeRevision=revision
        val beforeView=viewPreset
        val beforeProgram=ncProgram
        val beforeStage=ncFirstStage
        val beforeBlocks=ncBlocks
        val beforeAxisWords=ncAxisWords
        val beforeParsed=ncParsed
        val beforePreview=ncPreview
        return try {
            PageCommandCatalog.validate(command)
            when {
                command.commandId.endsWith(".MACHINE.VIEW") -> setView(command)
                command.commandId.endsWith(".MACHINE.HOME_VIEW") -> homeView(command)
                ".MACHINE.JOG_" in command.commandId -> jog(command)
                command.commandId.endsWith(".NC_FIRST.OPEN") -> openNc(command)
                command.commandId.endsWith(".NC_FIRST.PARSE") -> parseNc(command)
                command.commandId.endsWith(".NC_FIRST.PREVIEW") -> previewNc(command)
                else -> error("Axis command not implemented: ${command.commandId}")
            }
        } catch(t:Throwable) {
            positions.clear(); positions.putAll(beforePositions)
            revision=beforeRevision
            viewPreset=beforeView
            ncProgram=beforeProgram
            ncFirstStage=beforeStage
            ncBlocks=beforeBlocks
            ncAxisWords=beforeAxisWords
            ncParsed=beforeParsed
            ncPreview=beforePreview
            reject(command,t.message ?: t::class.simpleName.orEmpty())
        }
    }

    override fun snapshot():PageSnapshot = PageSnapshot(pageId,revision,buildMap {
        positions.forEach{(axis,value)->put(axis.toString(),value.toString())}
        put("viewPreset",viewPreset.name)
        put("visibleRotaryAxes",AxisCockpitSkinContract.mode(pageId.id).visibleRotaryAxes.joinToString(","))
        put("skinKey",AxisCockpitSkinContract.mode(pageId.id).skinKey)
        put("ncFirstStage",ncFirstStage)
        put("ncBlocks",ncBlocks.toString())
        put("ncAxisWords",ncAxisWords.toString())
        put("ncMoveCount",(ncPreview?.trace?.points?.size ?: 0).toString())
        put("ncCannedCycleHoleCount",(ncPreview?.trace?.cannedCycleHoleCount ?: 0).toString())
        put("ncG34HoleCount",(ncPreview?.trace?.g34HoleCount ?: 0).toString())
        put("ncCycleModels",ncPreview?.trace?.cycleModels?.sorted()?.joinToString(",") ?: "")
        put("ncRemovedCells",(ncPreview?.removedCells ?: 0).toString())
        put("ncRemovedVolumeMm3",(ncPreview?.removedVolumeMm3 ?: 0.0).toString())
        put("ncFixtureCoverage",ncPreview?.risk?.fixtureCoverageWord ?: "UNKNOWN")
        put("ncPreflightReady",(ncPreview?.risk?.let(SimAcceptancePolicy::formalAcceptAllowed) ?: false).toString())
        put("ncHas3DResult",(ncPreview!=null).toString())
    })

    fun ncFirstMachiningResult():Machining3DResult?=ncPreview?.result
    fun ncFirstProgram():String=ncProgram
    fun setNcFirstFixtures(value:List<FixtureObstacle>,assembly:ToolAssemblyConfig=ncToolAssembly){
        ncFixtures=value.toList();ncToolAssembly=assembly;ncPreview=null
        if(ncParsed)ncFirstStage="PARSED"
        revision++
    }

    override fun messages():List<PageMessage> = localMessages.toList()
    override fun exportPayload(target:RuntimeLinkId):RuntimeBridgePayload?=null
    override fun importPayload(source:RuntimeLinkId,payload:RuntimeBridgePayload):PageResult=
        PageResult.Rejected(pageId,"AXIS_IMPORT_BRIDGE_NOT_ACTIVE",revision)

    private fun jog(command:PageCommand):PageResult {
        val match=Regex("""\.MACHINE\.JOG_([XYZABC])_(POS|NEG)$""").find(command.commandId)
            ?: error("Invalid JOG command")
        val axis=match.groupValues[1][0]
        require(axis in allowedAxes){"${pageId.id} does not support axis $axis"}
        val step=number(command,"step",1.0)
        require(step>0.0){"JOG step must be positive"}
        val sign=if(match.groupValues[2]=="POS")1.0 else -1.0
        val next=positions.getValue(axis)+sign*step
        if(axis in setOf('A','B','C')) require(kotlin.math.abs(next)<=360.0){"Rotary axis $axis exceeds ±360°"}
        positions[axis]=next
        revision++
        return accepted(command,mapOf(
            "axis" to axis.toString(),
            "position" to next.toString(),
            "step" to (sign*step).toString(),
        ))
    }

    private fun setView(command:PageCommand):PageResult {
        val requested=command.arguments["preset"] ?: "MACHINING_FIT"
        viewPreset=AxisViewPreset.valueOf(requested.uppercase())
        revision++
        val skin=AxisCockpitSkinContract.mode(pageId.id)
        return accepted(command,mapOf(
            "preset" to viewPreset.name,
            "zoom" to AxisCockpitSkinContract.zoomFor(viewPreset).toString(),
            "visibleRotaryAxes" to skin.visibleRotaryAxes.joinToString(","),
            "skinKey" to skin.skinKey,
        ))
    }

    private fun homeView(command:PageCommand):PageResult {
        viewPreset=AxisViewPreset.RESET
        revision++
        return accepted(command,mapOf(
            "preset" to viewPreset.name,
            "zoom" to AxisCockpitSkinContract.zoomFor(viewPreset).toString(),
        ))
    }

    private fun openNc(command:PageCommand):PageResult {
        val program=command.arguments["gcode"] ?: error("Missing NC-first gcode")
        require(program.isNotBlank()){"NC-first program must not be blank"}
        ncProgram=program
        ncBlocks=program.lineSequence().count{line->
            val clean=line.substringBefore(';').replace(Regex("""\([^)]*\)""")," ").trim()
            clean.isNotBlank() && clean!="%"
        }
        ncAxisWords=0
        ncParsed=false
        ncPreview=null
        ncFirstStage="OPEN"
        revision++
        return accepted(command,mapOf(
            "blocks" to ncBlocks.toString(),
            "stage" to ncFirstStage,
        ))
    }

    private fun parseNc(command:PageCommand):PageResult {
        require(ncProgram.isNotBlank()){"Open NC-first program before parse"}
        val axisWord=Regex("""(?i)([XYZABC])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?=\s|[A-Z]|;|$)""")
        val unsupported=linkedSetOf<Char>()
        var count=0
        ncProgram.lineSequence().forEachIndexed{index,raw->
            val clean=raw.replace(Regex("""\([^)]*\)""")," ").substringBefore(';').uppercase()
            axisWord.findAll(clean).forEach{match->
                val axis=match.groupValues[1][0]
                val value=match.groupValues[2].toDoubleOrNull()
                require(value!=null && value.isFinite()){"Invalid axis value at line ${index+1}: $axis"}
                if(axis !in allowedAxes) unsupported+=axis
                count++
            }
            val letters=Regex("""(?i)([XYZABC])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)?)""").findAll(clean)
            letters.forEach{m->if(m.groupValues[2].isBlank()) error("Axis ${m.groupValues[1]} missing numeric value at line ${index+1}")}
        }
        require(unsupported.isEmpty()){ "${pageId.id} NC-first forbids axis ${unsupported.joinToString(",")}" }
        val cFindings=NcSixAxisCompatibility.cFindings(ncProgram)
        require(cFindings.isEmpty()){cFindings.first().message}
        val legacy=NcSixAxisCompatibility.legacyProgram(ncProgram)
        val runtime=NcRuntimeInterlock.findings(legacy)
        require(runtime.isEmpty()){runtime.first().message}
        val profile=StudioFanucMachineProfile.rotaryProfile()
        val alarm=NcEditorAlarmRouter.firstAlarm(legacy,CncControllerProfile.FANUC,rotaryClampProfile=profile)
        require(alarm==null){alarm?.compact().orEmpty()}
        ncAxisWords=count
        ncParsed=true
        ncPreview=null
        ncFirstStage="PARSED"
        revision++
        return accepted(command,mapOf(
            "axisPrecheck" to "PASS",
            "fanucParser" to "PASS",
            "g34Profile" to profile.g34VendorProfile.template.name,
            "blocks" to ncBlocks.toString(),
            "axisWordCount" to ncAxisWords.toString(),
            "allowedAxes" to allowedAxes.joinToString(""),
            "cAxis" to if(NcSixAxisCompatibility.hasC(ncProgram))"VALIDATED" else "NOT_USED"
        ))
    }

    private fun previewNc(command:PageCommand):PageResult {
        require(ncParsed){"NC-first parse must pass before preview"}
        val toolDiameter=number(command,"toolDiameter",10.0)
        require(toolDiameter>0.0){"NC-first tool diameter must be positive"}
        val preview=NcFirstMachiningPreviewEngine.build(
            ncProgram,pageId.id,toolDiameter,ncFixtures,ncToolAssembly
        )
        ncPreview=preview
        ncAxisWords=preview.trace.axisWordCount
        ncFirstStage="PREVIEW_3D"
        revision++
        return accepted(command,mapOf(
            "previewLevel" to "MACHINING_3D_MATERIAL_REMOVAL",
            "axisWordCount" to ncAxisWords.toString(),
            "blocks" to ncBlocks.toString(),
            "machineMode" to pageId.id,
            "moveCount" to preview.trace.points.size.toString(),
            "cannedCycleHoleCount" to preview.trace.cannedCycleHoleCount.toString(),
            "g34HoleCount" to preview.trace.g34HoleCount.toString(),
            "cycleModels" to preview.trace.cycleModels.sorted().joinToString(","),
            "removedCells" to preview.removedCells.toString(),
            "removedVolumeMm3" to preview.removedVolumeMm3.toString(),
            "meshVertices" to preview.result.mesh.vertices.size.toString(),
            "meshTriangles" to preview.result.mesh.triangles.size.toString(),
            "collisionCount" to preview.risk.collisionCount.toString(),
            "overcutCount" to preview.risk.overcutCount.toString(),
            "fixtureCoverage" to preview.risk.fixtureCoverageWord,
            "preflightReady" to SimAcceptancePolicy.formalAcceptAllowed(preview.risk).toString()
        ))
    }

    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=
        PageResult.Accepted(pageId,command.commandId,revision,evidence)

    private fun reject(command:PageCommand,detail:String):PageResult {
        localMessages+=PageMessage(
            pageId,command.subpage.takeIf{it.page==pageId},"AXIS_COMMAND_REJECTED",detail,
            relatedButtonId=command.commandId,revision=revision,timestampEpochMs=System.currentTimeMillis(),
            severity=if(command.commandId.endsWith(".NC_FIRST.PARSE")||command.commandId.endsWith(".NC_FIRST.PREVIEW"))PageMessageSeverity.BLOCKED_ACTION else PageMessageSeverity.WARNING
        )
        return PageResult.Rejected(pageId,"AXIS_COMMAND_REJECTED",revision,detail)
    }

    private fun number(command:PageCommand,key:String,default:Double):Double =
        command.arguments[key]?.toDouble()?.also{require(it.isFinite()){ "$key must be finite" }} ?: default
}
