package com.aigstudio.core

import kotlin.math.cos
import kotlin.math.sin

private object CadPageCodec {
    fun encode(snapshot: DrawingSnapshot): String = snapshot.entities.joinToString("\n") { entity ->
        when (entity) {
            is Line -> listOf("L",entity.id,entity.a.x,entity.a.y,entity.b.x,entity.b.y).joinToString("|")
            is Circle -> listOf("C",entity.id,entity.center.x,entity.center.y,entity.radius).joinToString("|")
            is Arc -> listOf(
                "A",entity.id,entity.center.x,entity.center.y,entity.radius,
                entity.start.x,entity.start.y,entity.end.x,entity.end.y,entity.clockwise
            ).joinToString("|")
        }
    }

    fun decode(data: String): List<Entity> {
        if (data.isBlank()) return emptyList()
        return data.lineSequence().filter { it.isNotBlank() }.map { line ->
            val p=line.split('|')
            when(p.firstOrNull()) {
                "L" -> {
                    require(p.size==6){"Invalid LINE record"}
                    Line(id=p[1],a=Vec2(p[2].toDouble(),p[3].toDouble()),b=Vec2(p[4].toDouble(),p[5].toDouble()))
                }
                "C" -> {
                    require(p.size==5){"Invalid CIRCLE record"}
                    Circle(id=p[1],center=Vec2(p[2].toDouble(),p[3].toDouble()),radius=p[4].toDouble())
                }
                "A" -> {
                    require(p.size==10){"Invalid ARC record"}
                    Arc(
                        id=p[1],center=Vec2(p[2].toDouble(),p[3].toDouble()),radius=p[4].toDouble(),
                        start=Vec2(p[5].toDouble(),p[6].toDouble()),end=Vec2(p[7].toDouble(),p[8].toDouble()),
                        clockwise=p[9].toBooleanStrict()
                    )
                }
                else -> error("Unknown CAD record: ${p.firstOrNull()}")
            }
        }.toList()
    }
}

class CadPageRuntime : PageRuntime {
    override val pageId: PageId = PageId.CAD
    private val document=DrawingDocument()
    private var history=History(document)
    private val localMessages=mutableListOf<PageMessage>()
    private var revision=0L
    private var lastCommand="NONE"
    private var photoAlignX=0.0
    private var photoAlignY=0.0
    private var photoRotationDeg=0.0
    private var photoScaleMmPerPixel=1.0

    override fun dispatch(command: PageCommand): PageResult {
        return try {
            PageCommandCatalog.validate(command)
            val result=when(command.commandId) {
                "CAD.DRAW.LINE" -> drawLine(command)
                "CAD.DRAW.RECT" -> drawRect(command)
                "CAD.DRAW.CIRCLE" -> drawCircle(command,false)
                "CAD.DRAW.ARC" -> drawArc(command)
                "CAD.DRAW.HOLE" -> drawCircle(command,true)
                "CAD.EDIT.TRIM" -> runGeometry(command,CadEditEngine.trimCommand(document,ids(command)))
                "CAD.EDIT.EXTEND" -> runGeometry(command,CadEditEngine.extendCommand(document,ids(command)))
                "CAD.EDIT.OFFSET" -> runGeometry(command,CadEditEngine.offsetCommand(document,ids(command),number(command,"distance")))
                "CAD.EDIT.ARRAY" -> runGeometry(command,CadEditEngine.linearArrayCommand(
                    document,ids(command),int(command,"count"),number(command,"dx"),number(command,"dy")
                ))
                "CAD.EDIT.CHAMFER" -> chamfer(command)
                "CAD.EDIT.FILLET" -> fillet(command)
                "CAD.EDIT.UNDO" -> undo(command)
                "CAD.EDIT.REDO" -> redo(command)
                "CAD.FILE.OPEN","CAD.FILE.IMPORT" -> openData(command)
                "CAD.FILE.SAVE","CAD.FILE.EXPORT" -> saveData(command)
                "CAD.PHOTO.ALIGN" -> photoAlign(command)
                "CAD.PHOTO.SCALE" -> photoScale(command)
                "CAD.VIEW.SNAP" -> snap(command)
                else -> error("CAD command not implemented: ${command.commandId}")
            }
            lastCommand=command.commandId
            result
        } catch(t:Throwable) {
            reject(command,t.message ?: t::class.simpleName.orEmpty())
        }
    }

    override fun snapshot(): PageSnapshot = PageSnapshot(
        pageId,revision,mapOf(
            "entityCount" to document.size().toString(),
            "lastCommand" to lastCommand,
            "photoAlignX" to photoAlignX.toString(),
            "photoAlignY" to photoAlignY.toString(),
            "photoRotationDeg" to photoRotationDeg.toString(),
            "photoScaleMmPerPixel" to photoScaleMmPerPixel.toString(),
        )
    )

    fun geometrySnapshot(): DrawingSnapshot=document.snapshot()

    override fun messages(): List<PageMessage> = localMessages.toList()

    override fun exportPayload(target: RuntimeLinkId): RuntimeBridgePayload? = null

    override fun importPayload(source: RuntimeLinkId, payload: RuntimeBridgePayload): PageResult =
        PageResult.Rejected(pageId,"CAD_IMPORT_BRIDGE_NOT_ACTIVE",revision)

    private fun drawLine(command:PageCommand):PageResult {
        val a=Vec2(number(command,"x1"),number(command,"y1"))
        val b=Vec2(number(command,"x2"),number(command,"y2"))
        require(a.distanceTo(b)>=CNC_RESOLUTION_MM){"LINE length must be >= 0.001 mm"}
        return runGeometry(command,AddEntitiesCommand(listOf(Line(a=a,b=b))))
    }

    private fun drawRect(command:PageCommand):PageResult {
        val x1=number(command,"x1"); val y1=number(command,"y1")
        val x2=number(command,"x2"); val y2=number(command,"y2")
        require(kotlin.math.abs(x2-x1)>=CNC_RESOLUTION_MM && kotlin.math.abs(y2-y1)>=CNC_RESOLUTION_MM){
            "RECT width/height must be >= 0.001 mm"
        }
        val minX=minOf(x1,x2); val maxX=maxOf(x1,x2); val minY=minOf(y1,y2); val maxY=maxOf(y1,y2)
        val ids=CadSemanticIdentity.newRectIds()
        val lines=listOf(
            Line(id=ids[0],a=Vec2(minX,minY),b=Vec2(maxX,minY)),
            Line(id=ids[1],a=Vec2(maxX,minY),b=Vec2(maxX,maxY)),
            Line(id=ids[2],a=Vec2(maxX,maxY),b=Vec2(minX,maxY)),
            Line(id=ids[3],a=Vec2(minX,maxY),b=Vec2(minX,minY)),
        )
        return runGeometry(command,AddEntitiesCommand(lines))
    }

    private fun drawCircle(command:PageCommand,hole:Boolean):PageResult {
        val r=number(command,"r")
        require(r>=CNC_RESOLUTION_MM){"CIRCLE radius must be >= 0.001 mm"}
        val id=if(hole) CadSemanticIdentity.newHoleId() else java.util.UUID.randomUUID().toString()
        val circle=Circle(id=id,center=Vec2(number(command,"cx"),number(command,"cy")),radius=r)
        return runGeometry(command,AddEntitiesCommand(listOf(circle)))
    }

    private fun drawArc(command:PageCommand):PageResult {
        val center=Vec2(number(command,"cx"),number(command,"cy"))
        val r=number(command,"r")
        require(r>=CNC_RESOLUTION_MM){"ARC radius must be >= 0.001 mm"}
        val sa=Math.toRadians(number(command,"startDeg")); val ea=Math.toRadians(number(command,"endDeg"))
        val arc=Arc(
            center=center,radius=r,
            start=Vec2(center.x+r*cos(sa),center.y+r*sin(sa)),
            end=Vec2(center.x+r*cos(ea),center.y+r*sin(ea)),
            clockwise=bool(command,"clockwise",false)
        )
        return runGeometry(command,AddEntitiesCommand(listOf(arc)))
    }

    private fun chamfer(command:PageCommand):PageResult {
        val selected=ids(command)
        require(selected.size==2){"CHAMFER requires two LINE IDs"}
        val a=document.get(selected[0]) as? Line ?: error("CHAMFER first entity must be LINE")
        val b=document.get(selected[1]) as? Line ?: error("CHAMFER second entity must be LINE")
        val r=Geometry.chamfer(a,b,number(command,"distance"))
        return runGeometry(command,ReplaceEntitiesCommand(listOf(a,b),listOf(r.first,r.second,r.bridge)))
    }

    private fun fillet(command:PageCommand):PageResult {
        val selected=ids(command)
        require(selected.size==2){"FILLET requires two LINE IDs"}
        val a=document.get(selected[0]) as? Line ?: error("FILLET first entity must be LINE")
        val b=document.get(selected[1]) as? Line ?: error("FILLET second entity must be LINE")
        val r=Geometry.fillet(a,b,number(command,"radius"))
        return runGeometry(command,ReplaceEntitiesCommand(listOf(a,b),listOf(r.first,r.second,r.arc)))
    }

    private fun undo(command:PageCommand):PageResult {
        val outcome=history.undoOutcome() ?: error("Nothing to undo")
        if(outcome.geometryMutation) revision++
        return accepted(command,mapOf("entityCount" to document.size().toString(),"operation" to "UNDO"))
    }

    private fun redo(command:PageCommand):PageResult {
        val outcome=history.redoOutcome() ?: error("Nothing to redo")
        if(outcome.geometryMutation) revision++
        return accepted(command,mapOf("entityCount" to document.size().toString(),"operation" to "REDO"))
    }

    private fun openData(command:PageCommand):PageResult {
        val parsed=CadPageCodec.decode(text(command,"data"))
        document.clear()
        parsed.forEach(document::put)
        history=History(document)
        revision++
        return accepted(command,mapOf("entityCount" to document.size().toString(),"loaded" to "true"))
    }

    private fun saveData(command:PageCommand):PageResult = accepted(command,mapOf(
        "entityCount" to document.size().toString(),
        "cadData" to CadPageCodec.encode(document.snapshot())
    ))

    private fun photoAlign(command:PageCommand):PageResult {
        photoAlignX=number(command,"x"); photoAlignY=number(command,"y")
        photoRotationDeg=number(command,"rotationDeg",0.0)
        revision++
        return accepted(command,mapOf("aligned" to "true"))
    }

    private fun photoScale(command:PageCommand):PageResult {
        val scale=number(command,"mmPerPixel")
        require(scale.isFinite() && scale>0.0){"Photo scale must be positive"}
        photoScaleMmPerPixel=scale
        revision++
        return accepted(command,mapOf("mmPerPixel" to scale.toString()))
    }

    private fun snap(command:PageCommand):PageResult {
        val point=Vec2(number(command,"x"),number(command,"y"))
        val tolerance=number(command,"tolerance",CNC_RESOLUTION_MM)
        val modes=command.arguments["modes"]?.split(',')?.filter{it.isNotBlank()}?.map{SnapMode.valueOf(it.trim())}?.toSet()
            ?: SnapMode.entries.toSet()
        val reference=if(command.arguments.containsKey("referenceX") && command.arguments.containsKey("referenceY"))
            Vec2(number(command,"referenceX"),number(command,"referenceY")) else null
        val hit=CadSnapEngine.snapTo(document,point,tolerance,modes,reference)
        return accepted(command,if(hit==null) mapOf("snapped" to "false") else mapOf(
            "snapped" to "true","x" to hit.x.toString(),"y" to hit.y.toString()
        ))
    }

    private fun runGeometry(command:PageCommand,coreCommand:Command):PageResult {
        history.run(coreCommand)
        revision++
        return accepted(command,mapOf("entityCount" to document.size().toString(),"geometryRevision" to revision.toString()))
    }

    private fun accepted(command:PageCommand,evidence:Map<String,String> = emptyMap())=
        PageResult.Accepted(pageId,command.commandId,revision,evidence)

    private fun reject(command:PageCommand,detail:String):PageResult {
        localMessages+=PageMessage(
            pageId,command.subpage.takeIf{it.page==pageId},"CAD_COMMAND_REJECTED",detail,
            relatedButtonId=command.commandId,revision=revision,timestampEpochMs=System.currentTimeMillis(),
            severity=PageMessageSeverity.WARNING
        )
        return PageResult.Rejected(pageId,"CAD_COMMAND_REJECTED",revision,detail)
    }

    private fun ids(command:PageCommand):List<EntityId> = text(command,"ids").split(',').map{it.trim()}.filter{it.isNotEmpty()}
    private fun text(command:PageCommand,key:String):String = command.arguments[key] ?: error("Missing CAD argument: $key")
    private fun number(command:PageCommand,key:String):Double = text(command,key).toDouble().also{require(it.isFinite()){ "$key must be finite" }}
    private fun number(command:PageCommand,key:String,default:Double):Double = command.arguments[key]?.toDouble()?.also{require(it.isFinite())} ?: default
    private fun int(command:PageCommand,key:String):Int = text(command,key).toInt()
    private fun bool(command:PageCommand,key:String,default:Boolean):Boolean = command.arguments[key]?.toBooleanStrictOrNull() ?: default
}
