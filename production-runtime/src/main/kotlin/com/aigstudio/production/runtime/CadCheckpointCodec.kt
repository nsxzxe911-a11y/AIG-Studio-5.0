package com.aigstudio.production.runtime

import kotlin.math.abs

data class CadCheckpointEntity(
    val kind:String,
    val id:String,
    val values:List<Double>,
    val layer:CleanCadLayer,
)
data class CadCheckpointTopology(val aId:String,val bId:String)
data class CadCheckpointDimension(
    val id:String,
    val kind:CleanCadDimensionKind,
    val valueMm:Double,
    val targetIds:List<String>,
)
data class CadCheckpointData(
    val revision:Long,
    val activeLayer:CleanCadLayer,
    val visibility:Map<CleanCadLayer,Boolean>,
    val entities:List<CadCheckpointEntity>,
    val topology:List<CadCheckpointTopology>,
    val dimensions:List<CadCheckpointDimension>,
)

object CadCheckpointCodec {
    const val HEADER="AIG_CAD_CHECKPOINT_V1"
    private const val MIN_MM=0.001

    fun encode(data:CadCheckpointData):String {
        validate(data)
        return buildString {
            appendLine(HEADER)
            appendLine("REV|${data.revision}")
            appendLine("ACTIVE|${data.activeLayer.name}")
            CleanCadLayer.entries.forEach { layer ->
                appendLine("VIS|${layer.name}|${if(data.visibility[layer]!=false)1 else 0}")
            }
            data.entities.forEach { e ->
                append("E|").append(e.kind).append('|').append(e.id)
                e.values.forEach { append('|').append(it.toString()) }
                append('|').append(e.layer.name).append('\n')
            }
            data.topology.forEach { appendLine("T|${it.aId}|${it.bId}") }
            data.dimensions.forEach { d ->
                appendLine("D|${d.id}|${d.kind.name}|${d.valueMm}|${d.targetIds.joinToString(",")}")
            }
            appendLine("END")
        }
    }

    fun decode(raw:String):CadCheckpointData {
        val normalized=raw.replace("\r\n","\n").replace('\r','\n').trimEnd('\n')
        val lines=normalized.split('\n')
        require(lines.size>=4 && lines.first()==HEADER) { "Unsupported CAD checkpoint schema" }
        require(lines.last()=="END") { "CAD checkpoint is truncated" }
        var revision:Long?=null
        var active:CleanCadLayer?=null
        val visibility=linkedMapOf<CleanCadLayer,Boolean>()
        val entities=mutableListOf<CadCheckpointEntity>()
        val topology=mutableListOf<CadCheckpointTopology>()
        val dimensions=mutableListOf<CadCheckpointDimension>()
        lines.drop(1).dropLast(1).forEach { line ->
            require(line.isNotBlank()) { "Blank checkpoint record" }
            val p=line.split('|')
            when(p[0]) {
                "REV" -> { require(p.size==2 && revision==null); revision=p[1].toLongOrNull() ?: error("Invalid checkpoint revision") }
                "ACTIVE" -> { require(p.size==2 && active==null); active=enumValueOf<CleanCadLayer>(p[1]) }
                "VIS" -> {
                    require(p.size==3); val layer=enumValueOf<CleanCadLayer>(p[1]); require(layer !in visibility)
                    visibility[layer]=when(p[2]){"1"->true;"0"->false;else->error("Invalid layer visibility")}
                }
                "E" -> entities += parseEntity(p)
                "T" -> { require(p.size==3); topology += CadCheckpointTopology(cleanId(p[1]),cleanId(p[2])) }
                "D" -> {
                    require(p.size==5); val targets=p[4].split(',').filter{it.isNotBlank()}.map(::cleanId)
                    dimensions += CadCheckpointDimension(cleanId(p[1]),enumValueOf<CleanCadDimensionKind>(p[2]),number(p[3],"dimension"),targets)
                }
                else -> error("Unknown checkpoint record: ${p[0]}")
            }
        }
        val out=CadCheckpointData(
            revision ?: error("Checkpoint revision missing"),
            active ?: error("Checkpoint active layer missing"),
            visibility.toMap(),entities,topology,dimensions,
        )
        validate(out)
        return out
    }

    private fun parseEntity(p:List<String>):CadCheckpointEntity {
        require(p.size>=5)
        val kind=p[1]; val id=cleanId(p[2]); val expected=when(kind){"LINE","RECT"->4;"CIRCLE","HOLE"->3;"ARC"->5;else->error("Unknown CAD entity kind: $kind")}
        require(p.size==4+expected) { "Invalid $kind checkpoint record" }
        val values=p.subList(3,3+expected).mapIndexed { i,v -> number(v,"$kind[$i]") }
        val layer=enumValueOf<CleanCadLayer>(p.last())
        return CadCheckpointEntity(kind,id,values,layer)
    }

    private fun cleanId(raw:String):String {
        require(raw.isNotBlank() && '|' !in raw && '\n' !in raw && '\r' !in raw) { "Invalid checkpoint id" }
        return raw
    }
    private fun number(raw:String,label:String)=raw.toDoubleOrNull()?.takeIf{it.isFinite()} ?: error("Invalid $label number")

    fun validate(data:CadCheckpointData) {
        require(data.revision>=0L) { "Checkpoint revision must be nonnegative" }
        require(data.visibility.keys==CleanCadLayer.entries.toSet()) { "Checkpoint layer visibility incomplete" }
        val ids=data.entities.map{cleanId(it.id)}
        require(ids.size==ids.toSet().size) { "Duplicate checkpoint entity id" }
        data.entities.forEach { e ->
            require(e.values.all{it.isFinite()}) { "Non-finite CAD checkpoint geometry" }
            when(e.kind) {
                "LINE" -> { require(e.values.size==4); require(abs(e.values[2]-e.values[0])>=MIN_MM || abs(e.values[3]-e.values[1])>=MIN_MM){"LINE below 0.001 mm"} }
                "RECT" -> { require(e.values.size==4); require(abs(e.values[2]-e.values[0])>=MIN_MM && abs(e.values[3]-e.values[1])>=MIN_MM){"RECT below 0.001 mm"} }
                "CIRCLE","HOLE" -> { require(e.values.size==3 && e.values[2]>=MIN_MM){"Circle radius below 0.001 mm"} }
                "ARC" -> { require(e.values.size==5 && e.values[2]>=MIN_MM && abs(e.values[4])>1e-9){"Invalid ARC checkpoint"} }
                else -> error("Unknown CAD checkpoint entity")
            }
        }
        val live=ids.toSet()
        val topoKeys=mutableSetOf<String>()
        data.topology.forEach { t ->
            require(t.aId in live && t.bId in live && t.aId!=t.bId) { "Topology checkpoint entity missing" }
            require(topoKeys.add(listOf(t.aId,t.bId).sorted().joinToString("|"))) { "Duplicate topology link" }
        }
        val dimIds=mutableSetOf<String>()
        data.dimensions.forEach { d ->
            cleanId(d.id); require(dimIds.add(d.id)) { "Duplicate dimension id" }
            require(d.valueMm.isFinite() && d.valueMm>=MIN_MM) { "Dimension below 0.001 mm" }
            if(d.kind==CleanCadDimensionKind.DIAMETER) require(d.valueMm>=MIN_MM*2.0) { "Diameter below 0.002 mm" }
            require(d.targetIds.isNotEmpty() && d.targetIds.all{it in live}) { "Dimension checkpoint target missing" }
        }
    }
}
