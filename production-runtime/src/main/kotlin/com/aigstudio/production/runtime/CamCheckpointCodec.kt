package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import java.util.Base64
import kotlin.math.abs

data class CamCheckpointData(
    val state:CamState,
    val baseline:List<CamPointSnapshot>,
)

object CamCheckpointCodec {
    const val HEADER="AIG_CAM_CHECKPOINT_V1"
    private val encoder=Base64.getUrlEncoder().withoutPadding()
    private val decoder=Base64.getUrlDecoder()

    fun encode(data:CamCheckpointData):String {
        validate(data)
        val s=data.state
        return buildString {
            appendLine(HEADER)
            val r=s.strategy.machiningRegion
            append("STRAT|${s.strategy.toolNumber}|${s.strategy.toolDiameterMm}|${s.strategy.depthMm}|${s.strategy.safeZMm}|${s.strategy.feedMmMin}|${s.strategy.spindleRpm}|${s.strategy.side.name}|${s.strategy.direction.name}|${s.strategy.leadInMm}|${s.strategy.leadOutMm}|${s.strategy.revision}|${enc(s.strategy.digest)}|")
            if(r==null) appendLine("0|0|0|0|0") else appendLine("1|${r.minX}|${r.minY}|${r.maxX}|${r.maxY}")
            appendLine("LINK|${s.sourceLink.name}|${s.toolpathLink.name}")
            s.source?.let { source ->
                appendLine("SOURCE|${source.kind.name}|${enc(source.sourceId)}|${source.sourceRevision}|${enc(source.digest)}")
                source.contours.forEachIndexed { ci,c -> c.points.forEach { p -> appendLine("SC|$ci|${p.xMm}|${p.yMm}") } }
                source.zones.forEach { z -> appendLine(zoneLine("SZ",z)) }
            }
            s.active?.let { a ->
                appendLine("ACTIVE|${enc(a.id)}|${a.revision}|${enc(a.digest)}|${if(a.frozen)1 else 0}|${a.sourceRevision?.toString() ?: "-"}|${a.strategyRevision}")
                a.points.forEach { appendLine(pointLine("AP",it)) }
            }
            s.candidate?.let { c ->
                appendLine("CANDIDATE|${enc(c.id)}|${c.revision}|${enc(c.digest)}|${c.sourceRevision?.toString() ?: "-"}|${c.strategyRevision}")
                c.points.forEach { appendLine(pointLine("CP",it)) }
            }
            s.savedCandidates.forEachIndexed { index,c ->
                appendLine("SAVED|$index|${enc(c.id)}|${c.revision}|${enc(c.digest)}|${c.sourceRevision?.toString() ?: "-"}|${c.strategyRevision}")
                c.points.forEach { appendLine("SP|$index|${pointFields(it)}") }
            }
            s.zones.forEach { z -> appendLine(zoneLine("ZONE",z)) }
            s.saveHistory.forEach { h -> appendLine("HIST|${h.revision}|${enc(h.kind)}|${enc(h.id)}|${enc(h.digest)}|${enc(h.message)}") }
            appendLine("PREVIEW|${s.previewCandidateId?.let(::enc) ?: "-"}")
            data.baseline.forEach { appendLine(pointLine("BASE",it)) }
            appendLine("END")
        }
    }

    fun decode(raw:String):CamCheckpointData {
        val lines=raw.replace("\r\n","\n").replace('\r','\n').trimEnd('\n').split('\n')
        require(lines.size>=4 && lines.first()==HEADER){"Unsupported CAM checkpoint schema"}
        require(lines.last()=="END") {"CAM checkpoint is truncated"}
        var strategy:CamStrategySnapshot?=null
        var sourceLink:CamSourceLinkState?=null
        var toolpathLink:CamToolpathLinkState?=null
        var sourceHeader:SourceHeader?=null
        val sourceContours=linkedMapOf<Int,MutableList<CamSourcePoint>>()
        val sourceZones=mutableListOf<CamZoneSnapshot>()
        var activeHeader:ActiveHeader?=null
        val activePoints=mutableListOf<CamPointSnapshot>()
        var candidateHeader:CandidateHeader?=null
        val candidatePoints=mutableListOf<CamPointSnapshot>()
        val savedHeaders=linkedMapOf<Int,CandidateHeader>()
        val savedPoints=linkedMapOf<Int,MutableList<CamPointSnapshot>>()
        val zones=mutableListOf<CamZoneSnapshot>()
        val history=mutableListOf<CamSaveRecord>()
        var preview:String?=null
        var previewSeen=false
        val baseline=mutableListOf<CamPointSnapshot>()

        lines.drop(1).dropLast(1).forEach { line ->
            require(line.isNotBlank()){"Blank CAM checkpoint record"}
            val p=line.split('|')
            when(p[0]) {
                "STRAT" -> {
                    require(p.size==18 && strategy==null)
                    val region=when(p[13]) {
                        "0" -> null
                        "1" -> CamMachiningRegion(num(p[14]),num(p[15]),num(p[16]),num(p[17]))
                        else -> error("Invalid CAM region flag")
                    }
                    strategy=CamStrategySnapshot(
                        p[1].toIntOrNull() ?: error("Invalid tool number"), num(p[2]),num(p[3]),num(p[4]),num(p[5]),num(p[6]),
                        enumValueOf<CamContourSide>(p[7]),enumValueOf<CamContourDirection>(p[8]),num(p[9]),num(p[10]),region,
                        p[11].toLongOrNull() ?: error("Invalid strategy revision"),dec(p[12]),
                    )
                }
                "LINK" -> { require(p.size==3 && sourceLink==null); sourceLink=enumValueOf(p[1]); toolpathLink=enumValueOf(p[2]) }
                "SOURCE" -> { require(p.size==5 && sourceHeader==null); sourceHeader=SourceHeader(enumValueOf(p[1]),dec(p[2]),p[3].toLongOrNull()?:error("Invalid source revision"),dec(p[4])) }
                "SC" -> { require(p.size==4); val i=p[1].toIntOrNull()?:error("Invalid contour index"); require(i>=0); sourceContours.getOrPut(i){mutableListOf()}.add(CamSourcePoint(num(p[2]),num(p[3]))) }
                "SZ" -> sourceZones += parseZone(p)
                "ACTIVE" -> { require(p.size==7 && activeHeader==null); activeHeader=ActiveHeader(dec(p[1]),long(p[2]),dec(p[3]),bool(p[4]),nullableLong(p[5]),long(p[6])) }
                "AP" -> activePoints += parsePoint(p,1)
                "CANDIDATE" -> { require(p.size==6 && candidateHeader==null); candidateHeader=CandidateHeader(dec(p[1]),long(p[2]),dec(p[3]),nullableLong(p[4]),long(p[5])) }
                "CP" -> candidatePoints += parsePoint(p,1)
                "SAVED" -> { require(p.size==7); val i=p[1].toIntOrNull()?:error("Invalid saved index"); require(i>=0 && i !in savedHeaders); savedHeaders[i]=CandidateHeader(dec(p[2]),long(p[3]),dec(p[4]),nullableLong(p[5]),long(p[6])) }
                "SP" -> { require(p.size==13); val i=p[1].toIntOrNull()?:error("Invalid saved point index"); savedPoints.getOrPut(i){mutableListOf()}.add(parsePoint(p,2)) }
                "ZONE" -> zones += parseZone(p)
                "HIST" -> { require(p.size==6); history += CamSaveRecord(long(p[1]),dec(p[2]),dec(p[3]),dec(p[4]),dec(p[5])) }
                "PREVIEW" -> { require(p.size==2 && !previewSeen); previewSeen=true; preview=if(p[1]=="-") null else dec(p[1]) }
                "BASE" -> baseline += parsePoint(p,1)
                else -> error("Unknown CAM checkpoint record: ${p[0]}")
            }
        }
        val st=strategy ?: error("CAM strategy missing")
        val sl=sourceLink ?: error("CAM source link missing")
        val tl=toolpathLink ?: error("CAM toolpath link missing")
        require(previewSeen){"CAM preview record missing"}
        val source=sourceHeader?.let { h ->
            val contourKeys=sourceContours.keys.toList()
            if(contourKeys.isNotEmpty()) require(contourKeys==(0..contourKeys.max()).toList()){"CAM contour indices are not contiguous"}
            CamSourceSnapshot(h.kind,h.id,h.revision,h.digest,sourceContours.toSortedMap().values.map{CamContourSnapshot(it.toList())},sourceZones.toList())
        }
        require(sourceHeader!=null || (sourceContours.isEmpty() && sourceZones.isEmpty())){"CAM source detail without source"}
        val active=activeHeader?.let { h -> CamToolpathVersion(h.id,h.revision,h.digest,activePoints.toList(),h.frozen,h.sourceRevision,h.strategyRevision) }
        require(activeHeader!=null || activePoints.isEmpty()){"Active points without header"}
        val candidate=candidateHeader?.let { h -> CamCandidateToolpath(h.id,h.revision,h.digest,candidatePoints.toList(),h.sourceRevision,h.strategyRevision) }
        require(candidateHeader!=null || candidatePoints.isEmpty()){"Candidate points without header"}
        val saved=savedHeaders.toSortedMap().map { (i,h) -> CamCandidateToolpath(h.id,h.revision,h.digest,savedPoints[i].orEmpty().toList(),h.sourceRevision,h.strategyRevision) }
        require(savedPoints.keys.all{it in savedHeaders}){"Saved points without header"}
        val state=CamState(source,sl,st,tl,active,candidate,saved,zones,history,preview,null)
        return CamCheckpointData(state,baseline).also(::validate)
    }

    fun validate(data:CamCheckpointData) {
        val s=data.state; val st=s.strategy
        require(st.toolNumber in 1..999 && st.toolDiameterMm.isFinite() && st.toolDiameterMm>0.0)
        require(st.depthMm.isFinite() && st.depthMm<0.0 && st.safeZMm.isFinite() && st.safeZMm>0.0)
        require(st.feedMmMin.isFinite() && st.feedMmMin>0.0 && st.spindleRpm.isFinite() && st.spindleRpm>0.0)
        require(st.leadInMm.isFinite() && st.leadInMm>=0.0 && st.leadOutMm.isFinite() && st.leadOutMm>=0.0)
        require(st.revision>=0L && st.digest.isNotBlank())
        st.machiningRegion?.let { r -> require(listOf(r.minX,r.minY,r.maxX,r.maxY).all{it.isFinite()} && r.maxX-r.minX>=0.001 && r.maxY-r.minY>=0.001) }
        if(s.sourceLink==CamSourceLinkState.CONNECTED) require(s.source!=null){"Connected CAM source missing"}
        s.source?.let { src -> require(src.kind!=CamSourceKind.NONE && src.sourceId.isNotBlank() && src.sourceRevision>=0 && src.digest.isNotBlank()); src.contours.flattenPoints().forEach(::validateSourcePoint); src.zones.forEach(::validateZone) }
        s.active?.let { require(it.revision>=1 && it.id.isNotBlank() && it.digest.isNotBlank() && it.points.size>=2); it.points.forEach(::validatePointBasic) }
        s.candidate?.let { require(it.revision>=1 && it.id.isNotBlank() && it.digest.isNotBlank() && it.points.size>=2); it.points.forEach(::validatePointBasic) }
        s.savedCandidates.forEach { require(it.revision>=1 && it.id.isNotBlank() && it.digest.isNotBlank() && it.points.size>=2); it.points.forEach(::validatePointBasic) }
        require(s.zones.map{it.id}.toSet().size==s.zones.size){"Duplicate CAM zone id"}; s.zones.forEach(::validateZone)
        if(s.previewCandidateId!=null) require(s.candidate?.id==s.previewCandidateId){"Preview candidate is stale"}
        if(data.baseline.isNotEmpty()) {
            require(data.baseline.size>=2){"CAM baseline requires at least two points"}
            data.baseline.forEach { p -> validatePointBasic(p); when(p.motion){ CamMotionKind.G0 -> require(p.z+1e-9>=st.safeZMm){"Baseline G0 below Safe-Z"}; CamMotionKind.G1,CamMotionKind.G2,CamMotionKind.G3 -> require(p.z<=1e-9){"Baseline cut above Z0"} } }
        }
        if(s.active!=null || s.candidate!=null) require(data.baseline.size>=2){"CAM baseline missing"}
    }

    private data class SourceHeader(val kind:CamSourceKind,val id:String,val revision:Long,val digest:String)
    private data class ActiveHeader(val id:String,val revision:Long,val digest:String,val frozen:Boolean,val sourceRevision:Long?,val strategyRevision:Long)
    private data class CandidateHeader(val id:String,val revision:Long,val digest:String,val sourceRevision:Long?,val strategyRevision:Long)
    private fun List<CamContourSnapshot>.flattenPoints()=flatMap{it.points}
    private fun validateSourcePoint(p:CamSourcePoint){ require(p.xMm.isFinite() && p.yMm.isFinite()){"Non-finite CAM source point"} }
    private fun validatePointBasic(p:CamPointSnapshot){ require(listOf(p.x,p.y,p.z,p.a,p.b,p.c).all{it.isFinite()}); require(abs(p.a)<=360.0 && abs(p.b)<=360.0 && abs(p.c)<=360.0); require(p.arcI?.isFinite()!=false && p.arcJ?.isFinite()!=false); if(p.motion==CamMotionKind.G2 || p.motion==CamMotionKind.G3) require(p.arcI!=null && p.arcJ!=null) }
    private fun validateZone(z:CamZoneSnapshot){ require(z.id.isNotBlank()); require(listOf(z.minX,z.minY,z.maxX,z.maxY,z.safeClearanceMm).all{it.isFinite()}); require(z.maxX-z.minX>=0.001 && z.maxY-z.minY>=0.001 && z.safeClearanceMm in 0.0..1000.0) }
    private fun pointLine(tag:String,p:CamPointSnapshot)="$tag|${pointFields(p)}"
    private fun pointFields(p:CamPointSnapshot)=listOf(p.x,p.y,p.z,p.a,p.b,p.c,p.motion.name,p.arcI?.toString()?:"-",p.arcJ?.toString()?:"-",if(p.manualOverride)"1" else "0",if(p.avoidance)"1" else "0").joinToString("|")
    private fun parsePoint(p:List<String>,offset:Int):CamPointSnapshot { require(p.size==offset+11); return CamPointSnapshot(num(p[offset]),num(p[offset+1]),num(p[offset+2]),num(p[offset+3]),num(p[offset+4]),num(p[offset+5]),enumValueOf(p[offset+6]),nullableNum(p[offset+7]),nullableNum(p[offset+8]),bool(p[offset+9]),bool(p[offset+10])) }
    private fun zoneLine(tag:String,z:CamZoneSnapshot)="$tag|${enc(z.id)}|${z.kind.name}|${z.minX}|${z.minY}|${z.maxX}|${z.maxY}|${z.safeClearanceMm}"
    private fun parseZone(p:List<String>):CamZoneSnapshot { require(p.size==8); return CamZoneSnapshot(dec(p[1]),enumValueOf(p[2]),num(p[3]),num(p[4]),num(p[5]),num(p[6]),num(p[7])) }
    private fun enc(s:String)=encoder.encodeToString(s.toByteArray(Charsets.UTF_8))
    private fun dec(s:String)=String(decoder.decode(s),Charsets.UTF_8)
    private fun num(s:String)=s.toDoubleOrNull()?.takeIf{it.isFinite()} ?: error("Invalid CAM number")
    private fun nullableNum(s:String)=if(s=="-") null else num(s)
    private fun long(s:String)=s.toLongOrNull()?.takeIf{it>=0L} ?: error("Invalid CAM revision")
    private fun nullableLong(s:String)=if(s=="-") null else long(s)
    private fun bool(s:String)=when(s){"1"->true;"0"->false;else->error("Invalid CAM boolean")}
}
