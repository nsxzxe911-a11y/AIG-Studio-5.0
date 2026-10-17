package com.aigstudio.core

import kotlin.math.abs

data class NcFirstMotionTrace(
    val points:List<ManualCamPoint>,
    val safeZ:Double,
    val depth:Double,
    val feedMmMin:Double,
    val axisWordCount:Int
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

    fun parse(program:String,machineMode:String):NcFirstMotionTrace {
        require(program.isNotBlank()){"NC-first program must not be blank"}
        val allowedAxes=allowed(machineMode)
        var absolute=true
        var units=1.0
        var arcCenterIncremental=true
        var motion:Int?=null
        var feed=150.0
        var x=0.0;var y=0.0;var z=0.0;var a=0.0;var b=0.0;var c=0.0
        var zKnown=false
        var axisWords=0
        val points=mutableListOf<ManualCamPoint>()

        program.lineSequence().forEachIndexed{index,raw->
            val clean=clean(raw)
            if(clean.isBlank()||clean.trim()=="%")return@forEachIndexed
            val words=word.findAll(clean).map{it.groupValues[1][0] to it.groupValues[2].toDouble()}.toList()
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
            gs.lastOrNull{g->listOf(0.0,1.0,2.0,3.0).any{abs(g-it)<1e-9}}?.let{motion=it.toInt()}
            by['F']?.lastOrNull()?.second?.let{rawF->feed=rawF*units;require(feed>0.0){"Feed must be positive"}}
            val hasAxis=by.keys.any{it in setOf('X','Y','Z','A','B','C')}
            val active=motion ?: return@forEachIndexed
            if(!hasAxis)return@forEachIndexed

            fun linearAxis(ch:Char,current:Double):Double {
                val rawValue=by[ch]?.lastOrNull()?.second ?: return current
                val scaled=if(ch in setOf('X','Y','Z'))rawValue*units else rawValue
                return if(absolute)scaled else current+scaled
            }
            val sx=x;val sy=y
            val nx=linearAxis('X',x);val ny=linearAxis('Y',y);val nz=linearAxis('Z',z)
            val na=linearAxis('A',a);val nb=linearAxis('B',b);val nc=linearAxis('C',c)
            require(listOf(nx,ny,nz,na,nb,nc).all{it.isFinite()}){"Non-finite NC-first coordinate at line ${index+1}"}
            require(listOf(na,nb,nc).all{abs(it)<=360.0}){"NC-first rotary axis exceeds ±360° at line ${index+1}"}

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
                    val rawI=by['I']?.lastOrNull()?.second ?: error("NC-first G$active requires I/J arc center at line ${index+1}")
                    val rawJ=by['J']?.lastOrNull()?.second ?: error("NC-first G$active requires I/J arc center at line ${index+1}")
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
        return NcFirstMotionTrace(points,rapidZ.minOrNull()!!,cuts.minOf{it.z},feed,axisWords)
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
        val cFindings=NcSixAxisCompatibility.cFindings(program)
        require(cFindings.isEmpty()){cFindings.first().message}
        val legacy=NcSixAxisCompatibility.legacyProgram(program)
        val runtimeFindings=NcRuntimeInterlock.findings(legacy)
        require(runtimeFindings.isEmpty()){runtimeFindings.first().message}
        val alarm=NcEditorAlarmRouter.firstAlarm(legacy,CncControllerProfile.FANUC)
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
