package com.aigstudio.core

import kotlin.math.abs

data class NcFirstMotionTrace(
    val points:List<ManualCamPoint>,
    val safeZ:Double,
    val depth:Double,
    val feedMmMin:Double,
    val axisWordCount:Int,
    val cannedCycleHoleCount:Int=0,
    val g34HoleCount:Int=0,
    val cycleModels:Set<String> = emptySet(),
)

data class NcFirstMachiningPreview(
    val trace:NcFirstMotionTrace,
    val result:Machining3DResult,
    val risk:MachiningRiskReport,
    val removedCells:Int,
    val removedVolumeMm3:Double,
    val machineMode:String
)

object NcFirstMotionParser {
    private val word=Regex("""(?i)([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?=\s|[A-Z]|;|$)""")
    private fun clean(raw:String)=raw.replace(Regex("""\([^)]*\)""")," ").substringBefore(';').uppercase()
    private fun allowed(mode:String):Set<Char> = when(mode.uppercase()){
        "3AX"->setOf('X','Y','Z')
        "4AX"->setOf('X','Y','Z','A')
        "5AX"->setOf('X','Y','Z','A','B')
        "6AX"->setOf('X','Y','Z','A','B','C')
        else->error("Unsupported machine mode: $mode")
    }
    private fun cycleKind(gs:List<Double>):NcCannedCycleKind? = when {
        gs.any{abs(it-81.0)<1e-9}->NcCannedCycleKind.G81
        gs.any{abs(it-73.0)<1e-9}->NcCannedCycleKind.G73
        gs.any{abs(it-83.0)<1e-9}->NcCannedCycleKind.G83
        else->null
    }

    fun parse(program:String,machineMode:String):NcFirstMotionTrace {
        require(program.isNotBlank()){"NC-first program must not be blank"}
        val allowedAxes=allowed(machineMode)
        var absolute=true
        var units=1.0
        var arcCenterIncremental=true
        var returnToInitial=true
        var motion:Int?=null
        var feed=150.0
        var x=0.0;var y=0.0;var z=0.0;var a=0.0;var b=0.0;var c=0.0
        var zKnown=false
        var axisWords=0
        var cannedCycleHoleCount=0
        var g34HoleCount=0
        var activeCycle:NcCannedCycleSpec?=null
        val cycleModels=linkedSetOf<String>()
        val points=mutableListOf<ManualCamPoint>()

        fun appendCycle(holes:List<Pair<Double,Double>>,spec:NcCannedCycleSpec,pa:Double,pb:Double,pc:Double):NcCannedCyclePlan {
            val plan=NcCannedCyclePlanner.expand(holes,spec)
            plan.steps.forEach { step ->
                points+=ManualCamPoint(step.x,step.y,step.z,step.rapid,axisA=pa,axisB=pb,axisC=pc)
            }
            cannedCycleHoleCount+=plan.holeCount
            cycleModels+=plan.modelTag
            return plan
        }

        program.lineSequence().forEachIndexed{index,raw->
            val cleaned=clean(raw)
            if(cleaned.isBlank()||cleaned.trim()=="%")return@forEachIndexed
            val words=word.findAll(cleaned).map{it.groupValues[1][0] to it.groupValues[2].toDouble()}.toList()
            val by=words.groupBy{it.first}
            listOf('X','Y','Z','A','B','C').forEach{axis->
                if((by[axis]?.size?:0)>1) error("Duplicate axis $axis at line ${index+1}")
                if(axis in by && axis !in allowedAxes) error("$machineMode NC-first forbids axis $axis")
            }
            axisWords+=words.count{it.first in setOf('X','Y','Z','A','B','C')}
            val gs=by['G'].orEmpty().map{it.second}
            if(gs.any{abs(it-90.0)<1e-9})absolute=true
            if(gs.any{abs(it-91.0)<1e-9})absolute=false
            if(gs.any{abs(it-20.0)<1e-9})units=25.4
            if(gs.any{abs(it-21.0)<1e-9})units=1.0
            if(gs.any{abs(it-90.1)<1e-9})arcCenterIncremental=false
            if(gs.any{abs(it-91.1)<1e-9})arcCenterIncremental=true
            if(gs.any{abs(it-98.0)<1e-9})returnToInitial=true
            if(gs.any{abs(it-99.0)<1e-9})returnToInitial=false
            if(gs.any{abs(it-80.0)<1e-9}){activeCycle=null;motion=null}
            gs.lastOrNull{g->listOf(0.0,1.0,2.0,3.0).any{abs(g-it)<1e-9}}?.let{motion=it.toInt();activeCycle=null}
            by['F']?.lastOrNull()?.second?.let{rawF->feed=rawF*units;require(feed>0.0){"Feed must be positive"}}

            fun rawLast(ch:Char):Double?=by[ch]?.lastOrNull()?.second
            fun lengthLast(ch:Char):Double?=rawLast(ch)?.times(units)
            fun linearAxis(ch:Char,current:Double):Double {
                val rawValue=rawLast(ch) ?: return current
                val scaled=if(ch in setOf('X','Y','Z'))rawValue*units else rawValue
                return if(absolute)scaled else current+scaled
            }
            fun posture():Triple<Double,Double,Double>{
                val na=linearAxis('A',a);val nb=linearAxis('B',b);val nc=linearAxis('C',c)
                require(listOf(na,nb,nc).all{it.isFinite()&&abs(it)<=360.0}){"NC-first rotary axis exceeds ±360° at line ${index+1}"}
                return Triple(na,nb,nc)
            }

            val hasG34=gs.any{abs(it-34.0)<1e-9}
            if(hasG34){
                require(absolute){"NC-first G34 material preview requires G90 absolute mode"}
                require(zKnown){"NC-first G34 requires a known initial Z plane before the pattern"}
                val interpretation=G34VendorInterpreter.interpret(cleaned,StudioFanucMachineProfile.g34VendorProfile)
                    ?: error("G34 machine profile interpretation unavailable")
                val kind=when(interpretation.cycleCode){
                    "G81"->NcCannedCycleKind.G81
                    "G73"->NcCannedCycleKind.G73
                    "G83"->NcCannedCycleKind.G83
                    else->error("NC-first G34 supports G81/G73/G83 material preview; got ${interpretation.cycleCode ?: "no cycle"}")
                }
                val centerX=interpretation.centerX?.times(units) ?: x
                val centerY=interpretation.centerY?.times(units) ?: y
                val holes=NcCycleGeometry.circularPattern(
                    centerX,centerY,interpretation.radiusMm*units,interpretation.holeCount,interpretation.startAngleDeg
                )
                val r=(interpretation.retractR ?: error("G34 canned cycle requires R")).times(units)
                val depth=(interpretation.depthZ ?: error("G34 canned cycle requires Z depth")).times(units)
                val q=interpretation.peckQ?.times(units)
                val cycleFeed=(interpretation.feedF?.times(units) ?: feed).also{require(it>0.0)}
                feed=cycleFeed
                val (na,nb,nc)=posture()
                val spec=NcCannedCycleSpec(kind,r,depth,q,cycleFeed,z,returnToInitial)
                val plan=appendCycle(holes,spec,na,nb,nc)
                activeCycle=spec
                g34HoleCount+=plan.holeCount
                val last=plan.steps.last()
                x=last.x;y=last.y;z=last.z;a=na;b=nb;c=nc;zKnown=true
                return@forEachIndexed
            }

            val explicitCycle=cycleKind(gs)
            if(explicitCycle!=null){
                require(absolute){"NC-first canned-cycle material preview requires G90 absolute mode"}
                require(zKnown){"NC-first canned cycle requires a known initial Z plane"}
                val nx=linearAxis('X',x);val ny=linearAxis('Y',y)
                val (na,nb,nc)=posture()
                val previous=activeCycle
                val r=lengthLast('R') ?: previous?.retractR ?: error("Canned cycle requires R plane")
                val depth=lengthLast('Z') ?: previous?.depthZ ?: error("Canned cycle requires Z depth")
                val q=lengthLast('Q') ?: previous?.peckQ
                val spec=NcCannedCycleSpec(explicitCycle,r,depth,q,feed,z,returnToInitial)
                val plan=appendCycle(listOf(nx to ny),spec,na,nb,nc)
                activeCycle=spec
                val last=plan.steps.last()
                x=last.x;y=last.y;z=last.z;a=na;b=nb;c=nc;zKnown=true
                return@forEachIndexed
            }

            if(activeCycle!=null && gs.none{g->listOf(0.0,1.0,2.0,3.0,80.0).any{abs(g-it)<1e-9}} && (by.containsKey('X')||by.containsKey('Y'))){
                require(absolute){"NC-first modal canned-cycle repeat requires G90 absolute mode"}
                val nx=linearAxis('X',x);val ny=linearAxis('Y',y)
                val (na,nb,nc)=posture()
                val previous=activeCycle!!
                val spec=previous.copy(
                    retractR=lengthLast('R') ?: previous.retractR,
                    depthZ=lengthLast('Z') ?: previous.depthZ,
                    peckQ=lengthLast('Q') ?: previous.peckQ,
                    feedMmMin=feed,
                    returnToInitial=returnToInitial,
                )
                val plan=appendCycle(listOf(nx to ny),spec,na,nb,nc)
                activeCycle=spec
                val last=plan.steps.last()
                x=last.x;y=last.y;z=last.z;a=na;b=nb;c=nc;zKnown=true
                return@forEachIndexed
            }

            val hasAxis=by.keys.any{it in setOf('X','Y','Z','A','B','C')}
            val active=motion ?: return@forEachIndexed
            if(!hasAxis)return@forEachIndexed

            val sx=x;val sy=y
            val nx=linearAxis('X',x);val ny=linearAxis('Y',y);val nz=linearAxis('Z',z)
            val (na,nb,nc)=posture()
            require(listOf(nx,ny,nz,na,nb,nc).all{it.isFinite()}){"Non-finite NC-first coordinate at line ${index+1}"}

            val hasZ='Z' in by
            if(!zKnown && !hasZ){
                x=nx;y=ny;a=na;b=nb;c=nc
                return@forEachIndexed
            }
            if(hasZ)zKnown=true

            val point=when(active){
                0->ManualCamPoint(nx,ny,nz,true,axisA=na,axisB=nb,axisC=nc)
                1->ManualCamPoint(nx,ny,nz,false,axisA=na,axisB=nb,axisC=nc)
                2,3->{
                    val rawI=rawLast('I') ?: error("NC-first G$active requires I/J arc center at line ${index+1}")
                    val rawJ=rawLast('J') ?: error("NC-first G$active requires I/J arc center at line ${index+1}")
                    val i=if(arcCenterIncremental)rawI*units else rawI*units-sx
                    val j=if(arcCenterIncremental)rawJ*units else rawJ*units-sy
                    ManualCamPoint(nx,ny,nz,false,i,j,active==2,na,nb,nc)
                }
                else->error("Unsupported motion G$active")
            }
            points+=point
            x=nx;y=ny;z=nz;a=na;b=nb;c=nc
        }

        require(points.size>=2){"NC-first requires at least two executable motion points"}
        require(points.first().rapid){"NC-first first executable motion must be G0"}
        val rapidZ=points.filter{it.rapid}.map{it.z}
        require(rapidZ.isNotEmpty() && rapidZ.all{it>0.0}){"NC-first rapid motion must remain above Z0"}
        val cuts=points.filter{!it.rapid}
        require(cuts.any{it.z<0.0}){"NC-first preview requires at least one cutting move below Z0"}
        require(cuts.all{it.z<=0.0}){"NC-first cutting motion above Z0 is not accepted by material preview"}
        return NcFirstMotionTrace(
            points,rapidZ.minOrNull()!!,cuts.minOf{it.z},feed,axisWords,
            cannedCycleHoleCount,g34HoleCount,cycleModels.toSet()
        )
    }
}

object NcFirstMachiningPreviewEngine {
    fun build(
        program:String,
        machineMode:String,
        toolDiameter:Double=10.0,
        fixtures:List<FixtureObstacle> = emptyList(),
        toolAssembly:ToolAssemblyConfig = ToolAssemblyConfig()
    ):NcFirstMachiningPreview {
        val compatibility=StudioFanucProgramCompatibility.findings(program)
        require(compatibility.isEmpty()){compatibility.first().message}
        val legacy=StudioFanucProgramCompatibility.legacyProgram(program)
        val runtimeFindings=NcRuntimeInterlock.findings(legacy)
        require(runtimeFindings.isEmpty()){runtimeFindings.first().message}
        val profile=StudioFanucMachineProfile.rotaryProfile()
        val alarm=NcEditorAlarmRouter.firstAlarm(legacy,CncControllerProfile.FANUC,rotaryClampProfile=profile)
        require(alarm==null){alarm?.compact().orEmpty()}
        val trace=NcFirstMotionParser.parse(program,machineMode)
        val settings=CamSettings(
            toolDiameter=toolDiameter,
            depth=trace.depth,
            safeZ=trace.safeZ,
            feedMmMin=trace.feedMmMin,
            pathMode=CamPathMode.MANUAL,
            manualPath=trace.points
        )
        val result=Machining3DEngine.build(
            DrawingSnapshot(emptyList()),settings,fixtures=fixtures,toolAssembly=toolAssembly
        )
        val risk=MachiningRiskScanner.inspect(result.cam,result.stock,result.fixtures,result.toolAssembly)
        val removedCells=result.removal.depth.count{it<0.0}
        val dx=(result.stock.maxX-result.stock.minX)/(result.removal.nx-1)
        val dy=(result.stock.maxY-result.stock.minY)/(result.removal.ny-1)
        val removedVolume=result.removal.depth.sumOf{d->if(d<0.0)-d*dx*dy else 0.0}
        return NcFirstMachiningPreview(trace,result,risk,removedCells,removedVolume,machineMode.uppercase())
    }
}
