package com.aigstudio.core

import java.util.ArrayDeque
import java.util.UUID
import kotlin.math.*

data class CadTopologyLink(val aId: EntityId, val bId: EntityId) {
    init { require(aId < bId) { "Topology link IDs must be distinct and canonical" } }
    fun contains(id: EntityId): Boolean = aId == id || bId == id
    companion object {
        fun of(first: EntityId, second: EntityId): CadTopologyLink {
            require(first != second) { "Topology link requires two distinct entities" }
            return if (first < second) CadTopologyLink(first, second) else CadTopologyLink(second, first)
        }
    }
}

class DrawingDocument {
    private val entities = LinkedHashMap<EntityId, Entity>()
    private val topologyLinks = linkedSetOf<CadTopologyLink>()

    fun all(): List<Entity> = entities.values.toList()
    fun get(id: EntityId): Entity? = entities[id]
    fun contains(id: EntityId): Boolean = entities.containsKey(id)
    fun put(entity: Entity) { entities[entity.id] = entity }
    fun remove(id: EntityId): Entity? {
        val removed = entities.remove(id)
        if (removed != null) topologyLinks.removeAll { it.contains(id) }
        return removed
    }
    fun clear() {
        entities.clear()
        topologyLinks.clear()
    }
    fun size(): Int = entities.size
    fun snapshot(): DrawingSnapshot = DrawingSnapshot(all().map { it.copyEntity() })
    fun links(): Set<CadTopologyLink> = topologyLinks.toSet()

    fun connect(link: CadTopologyLink): Boolean {
        require(contains(link.aId) && contains(link.bId)) { "Topology entity missing" }
        return topologyLinks.add(link)
    }
    fun disconnect(link: CadTopologyLink): Boolean = topologyLinks.remove(link)
    fun restoreLinks(links: Collection<CadTopologyLink>) {
        links.filter { contains(it.aId) && contains(it.bId) }.forEach(topologyLinks::add)
    }
    fun pruneTopology(tolerance: Double = JOIN_TOLERANCE_MM): Int {
        val before = topologyLinks.size
        topologyLinks.removeAll { link ->
            !contains(link.aId) || !contains(link.bId) ||
                runCatching { CadEditEngine.topologyDistance(this, link.aId, link.bId) > tolerance }
                    .getOrDefault(true)
        }
        return before - topologyLinks.size
    }
}

data class DrawingSnapshot(val entities: List<Entity>)

private fun Entity.copyEntity(): Entity = when (this) {
    is Line -> copy()
    is Circle -> copy()
    is Arc -> copy()
}

data class HistoryOutcome(
    val geometryMutation:Boolean,
    val selectionIds:Set<EntityId>?
)

interface Command {
    val geometryMutation: Boolean get() = true
    fun execute(doc: DrawingDocument)
    fun undo(doc: DrawingDocument)
    fun selectionAfterExecute(doc:DrawingDocument):Set<EntityId>? = null
    fun selectionAfterUndo(doc:DrawingDocument):Set<EntityId>? = null
}

class History(private val doc: DrawingDocument) {
    private val undoStack = ArrayDeque<Command>()
    private val redoStack = ArrayDeque<Command>()

    fun run(command: Command) {
        command.execute(doc)
        undoStack.addLast(command)
        redoStack.clear()
    }

    fun undoOutcome():HistoryOutcome? {
        val c=undoStack.pollLast() ?: return null
        c.undo(doc)
        redoStack.addLast(c)
        return HistoryOutcome(c.geometryMutation,c.selectionAfterUndo(doc))
    }

    fun redoOutcome():HistoryOutcome? {
        val c=redoStack.pollLast() ?: return null
        c.execute(doc)
        undoStack.addLast(c)
        return HistoryOutcome(c.geometryMutation,c.selectionAfterExecute(doc))
    }

    fun undoWithEffect(): Boolean? = undoOutcome()?.geometryMutation
    fun redoWithEffect(): Boolean? = redoOutcome()?.geometryMutation
    fun undo(): Boolean = undoOutcome()!=null
    fun redo(): Boolean = redoOutcome()!=null
}

class AddEntitiesCommand(private val entities: List<Entity>) : Command {
    override fun execute(doc: DrawingDocument) = entities.forEach(doc::put)
    override fun undo(doc: DrawingDocument) { entities.forEach { doc.remove(it.id) } }
    override fun selectionAfterExecute(doc:DrawingDocument)=entities.map{it.id}.filter(doc::contains).toSet()
    override fun selectionAfterUndo(doc:DrawingDocument)=emptySet<EntityId>()
}

class DeleteEntityCommand(private val id: EntityId) : Command {
    private var deleted: Entity? = null
    private var deletedLinks: Set<CadTopologyLink> = emptySet()
    override fun execute(doc: DrawingDocument) {
        deletedLinks = doc.links().filter { it.contains(id) }.toSet()
        deleted = doc.remove(id) ?: error("Entity not found: $id")
    }
    override fun undo(doc: DrawingDocument) {
        deleted?.let(doc::put)
        doc.restoreLinks(deletedLinks)
    }
    override fun selectionAfterExecute(doc:DrawingDocument)=emptySet<EntityId>()
    override fun selectionAfterUndo(doc:DrawingDocument)=setOf(id).filter(doc::contains).toSet()
}

class DeleteEntitiesCommand(private val ids: Set<EntityId>) : Command {
    private var deleted: List<Entity> = emptyList()
    private var deletedLinks: Set<CadTopologyLink> = emptySet()
    override fun execute(doc: DrawingDocument) {
        require(ids.isNotEmpty()) { "DELETE requires selected geometry" }
        deleted = ids.mapNotNull(doc::get)
        require(deleted.isNotEmpty()) { "Selected geometry not found" }
        deletedLinks = doc.links().filter { it.aId in ids || it.bId in ids }.toSet()
        deleted.forEach { doc.remove(it.id) }
    }
    override fun undo(doc: DrawingDocument) {
        deleted.forEach(doc::put)
        doc.restoreLinks(deletedLinks)
    }
    override fun selectionAfterExecute(doc:DrawingDocument)=emptySet<EntityId>()
    override fun selectionAfterUndo(doc:DrawingDocument)=deleted.map{it.id}.filter(doc::contains).toSet()
}

class ReplaceEntitiesCommand(
    private val before: List<Entity>,
    private val after: List<Entity>
) : Command {
    private var preservedLinks: Set<CadTopologyLink> = emptySet()

    override fun execute(doc: DrawingDocument) {
        val ids=before.map{it.id}.toSet()
        preservedLinks=doc.links().filter{it.aId in ids || it.bId in ids}.toSet()
        before.forEach { doc.remove(it.id) }
        after.forEach(doc::put)
        doc.restoreLinks(preservedLinks)
        doc.pruneTopology()
    }
    override fun undo(doc: DrawingDocument) {
        after.forEach { doc.remove(it.id) }
        before.forEach(doc::put)
        doc.restoreLinks(preservedLinks)
        doc.pruneTopology()
    }
    override fun selectionAfterExecute(doc:DrawingDocument)=after.map{it.id}.filter(doc::contains).toSet()
    override fun selectionAfterUndo(doc:DrawingDocument)=before.map{it.id}.filter(doc::contains).toSet()
}

class ConnectTopologyCommand(private val link: CadTopologyLink) : Command {
    override val geometryMutation: Boolean = false
    override fun execute(doc: DrawingDocument) {
        require(doc.connect(link)) { "Entities are already connected" }
    }
    override fun undo(doc: DrawingDocument) { doc.disconnect(link) }
}

class DisconnectTopologyCommand(private val link: CadTopologyLink) : Command {
    override val geometryMutation: Boolean = false
    override fun execute(doc: DrawingDocument) {
        require(doc.disconnect(link)) { "Selected entities are not connected" }
    }
    override fun undo(doc: DrawingDocument) { doc.connect(link) }
}

class DisconnectAllTopologyCommand : Command {
    override val geometryMutation: Boolean = false
    private var removed:Set<CadTopologyLink> = emptySet()
    override fun execute(doc:DrawingDocument) {
        removed=doc.links()
        removed.forEach(doc::disconnect)
    }
    override fun undo(doc:DrawingDocument) {
        doc.restoreLinks(removed)
    }
}

object CadEditEngine {
    private fun endpoints(entity: Entity): List<Vec2> = when (entity) {
        is Line -> listOf(entity.a, entity.b)
        is Arc -> listOf(entity.start, entity.end)
        is Circle -> emptyList()
    }

    private fun rotatePoint(p: Vec2, pivot: Vec2, angleDeg: Double): Vec2 {
        val r = Math.toRadians(angleDeg)
        val cs = cos(r); val sn = sin(r)
        val x = p.x - pivot.x; val y = p.y - pivot.y
        return Vec2(pivot.x + x * cs - y * sn, pivot.y + x * sn + y * cs)
    }

    private fun mirrorPoint(p: Vec2, vertical: Boolean, axis: Double): Vec2 =
        if (vertical) Vec2(2.0 * axis - p.x, p.y) else Vec2(p.x, 2.0 * axis - p.y)

    private fun moved(entity: Entity, dx: Double, dy: Double, keepId: Boolean, newId:EntityId?=null): Entity = when (entity) {
        is Line -> if (keepId) entity.copy(a=entity.a+Vec2(dx,dy), b=entity.b+Vec2(dx,dy))
            else Line(id=newId ?: UUID.randomUUID().toString(),a=entity.a+Vec2(dx,dy), b=entity.b+Vec2(dx,dy))
        is Circle -> if (keepId) entity.copy(center=entity.center+Vec2(dx,dy))
            else Circle(id=newId ?: UUID.randomUUID().toString(),center=entity.center+Vec2(dx,dy), radius=entity.radius)
        is Arc -> if (keepId) entity.copy(center=entity.center+Vec2(dx,dy), start=entity.start+Vec2(dx,dy), end=entity.end+Vec2(dx,dy))
            else Arc(id=newId ?: UUID.randomUUID().toString(),center=entity.center+Vec2(dx,dy), radius=entity.radius, start=entity.start+Vec2(dx,dy), end=entity.end+Vec2(dx,dy), clockwise=entity.clockwise)
    }

    private fun rotated(entity: Entity, pivot: Vec2, angleDeg: Double): Entity = when (entity) {
        is Line -> entity.copy(a=rotatePoint(entity.a,pivot,angleDeg), b=rotatePoint(entity.b,pivot,angleDeg))
        is Circle -> entity.copy(center=rotatePoint(entity.center,pivot,angleDeg))
        is Arc -> entity.copy(
            center=rotatePoint(entity.center,pivot,angleDeg),
            start=rotatePoint(entity.start,pivot,angleDeg),
            end=rotatePoint(entity.end,pivot,angleDeg)
        )
    }

    private fun mirrored(entity: Entity, vertical: Boolean, axis: Double): Entity = when (entity) {
        is Line -> entity.copy(a=mirrorPoint(entity.a,vertical,axis), b=mirrorPoint(entity.b,vertical,axis))
        is Circle -> entity.copy(center=mirrorPoint(entity.center,vertical,axis))
        is Arc -> entity.copy(
            center=mirrorPoint(entity.center,vertical,axis),
            start=mirrorPoint(entity.start,vertical,axis),
            end=mirrorPoint(entity.end,vertical,axis),
            clockwise=!entity.clockwise
        )
    }
    private fun bounds(entity: Entity): DoubleArray = when (entity) {
        is Line -> doubleArrayOf(min(entity.a.x,entity.b.x), min(entity.a.y,entity.b.y), max(entity.a.x,entity.b.x), max(entity.a.y,entity.b.y))
        is Circle -> doubleArrayOf(entity.center.x-entity.radius, entity.center.y-entity.radius, entity.center.x+entity.radius, entity.center.y+entity.radius)
        is Arc -> doubleArrayOf(entity.center.x-entity.radius, entity.center.y-entity.radius, entity.center.x+entity.radius, entity.center.y+entity.radius)
    }

    fun selectionCenter(doc: DrawingDocument, ids: Collection<EntityId>): Vec2 {
        val selected = ids.mapNotNull(doc::get)
        require(selected.isNotEmpty()) { "No selected geometry" }
        val bb = selected.map(::bounds)
        return Vec2(
            (bb.minOf{it[0]} + bb.maxOf{it[2]}) / 2.0,
            (bb.minOf{it[1]} + bb.maxOf{it[3]}) / 2.0
        )
    }

    private fun requireFiniteEntity(entity:Entity,label:String) {
        require(bounds(entity).all{it.isFinite()}) { "$label result is non-finite" }
    }

    private fun nonZeroTranslation(dx:Double,dy:Double,label:String) {
        require(dx.isFinite() && dy.isFinite()) { "$label delta must be finite" }
        require(abs(dx)>=CNC_RESOLUTION_MM || abs(dy)>=CNC_RESOLUTION_MM) {
            "$label delta must move at least 0.001 mm on X or Y"
        }
    }

    private fun effectiveRotation(angleDeg:Double):Double {
        require(angleDeg.isFinite()) { "ROTATE angle must be finite" }
        var normalized=angleDeg%360.0
        if(normalized>180.0) normalized-=360.0
        if(normalized<=-180.0) normalized+=360.0
        require(abs(normalized)>EPS) { "ROTATE angle produces no geometry change" }
        return normalized
    }

    fun moveCommand(doc: DrawingDocument, ids: Collection<EntityId>, dx: Double, dy: Double): Command {
        nonZeroTranslation(dx,dy,"MOVE")
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "MOVE requires selected geometry" }
        val after=before.map { moved(it,dx,dy,true).also { movedEntity -> requireFiniteEntity(movedEntity,"MOVE") } }
        return ReplaceEntitiesCommand(before,after)
    }

    fun copyCommand(doc: DrawingDocument, ids: Collection<EntityId>, dx: Double, dy: Double): Command {
        nonZeroTranslation(dx,dy,"COPY")
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "COPY requires selected geometry" }
        val idMap=CadSemanticIdentity.copiedIdMap(before)
        val copies=before.map {
            moved(it,dx,dy,false,idMap.getValue(it.id)).also { copy -> requireFiniteEntity(copy,"COPY") }
        }
        return AddEntitiesCommand(copies)
    }

    fun rotateCommand(doc: DrawingDocument, ids: Collection<EntityId>, angleDeg: Double, pivot: Vec2 = selectionCenter(doc,ids)): Command {
        require(pivot.x.isFinite() && pivot.y.isFinite()) { "ROTATE pivot must be finite" }
        val angle=effectiveRotation(angleDeg)
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "ROTATE requires selected geometry" }
        val after=before.map { rotated(it,pivot,angle).also { rotatedEntity -> requireFiniteEntity(rotatedEntity,"ROTATE") } }
        return ReplaceEntitiesCommand(before,after)
    }

    fun mirrorVerticalCommand(doc: DrawingDocument, ids: Collection<EntityId>, axisX: Double = selectionCenter(doc,ids).x): Command {
        require(axisX.isFinite()) { "MIRROR X axis must be finite" }
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "MIRROR requires selected geometry" }
        val after=before.map { mirrored(it,true,axisX).also { mirroredEntity -> requireFiniteEntity(mirroredEntity,"MIRROR X") } }
        return ReplaceEntitiesCommand(before,after)
    }

    fun mirrorHorizontalCommand(doc: DrawingDocument, ids: Collection<EntityId>, axisY: Double = selectionCenter(doc,ids).y): Command {
        require(axisY.isFinite()) { "MIRROR Y axis must be finite" }
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "MIRROR requires selected geometry" }
        val after=before.map { mirrored(it,false,axisY).also { mirroredEntity -> requireFiniteEntity(mirroredEntity,"MIRROR Y") } }
        return ReplaceEntitiesCommand(before,after)
    }

    fun trimCommand(doc: DrawingDocument, ids: Collection<EntityId>): Command {
        val pair=ids.distinct()
        require(pair.size==2) { "TRIM requires target then boundary selection" }
        val target=doc.get(pair[0]) as? Line ?: error("TRIM target must be LINE")
        val boundary=doc.get(pair[1]) as? Line ?: error("TRIM boundary must be LINE")
        val inter=Geometry.lineIntersection(target,boundary) ?: error("TRIM lines are parallel")
        require(inter.t1 in -EPS..1.0+EPS && inter.t2 in -EPS..1.0+EPS) {
            "TRIM requires a real segment intersection"
        }
        val da=target.a.distanceTo(inter.point)
        val db=target.b.distanceTo(inter.point)
        val after=if(da>=db) target.copy(b=inter.point) else target.copy(a=inter.point)
        require(after.length>=CNC_RESOLUTION_MM) { "TRIM result is below 0.001 mm" }
        return ReplaceEntitiesCommand(listOf(target),listOf(after))
    }

    fun extendCommand(doc: DrawingDocument, ids: Collection<EntityId>): Command {
        val pair=ids.distinct()
        require(pair.size==2) { "EXTEND requires target then boundary selection" }
        val target=doc.get(pair[0]) as? Line ?: error("EXTEND target must be LINE")
        val boundary=doc.get(pair[1]) as? Line ?: error("EXTEND boundary must be LINE")
        val inter=Geometry.lineIntersection(target,boundary) ?: error("EXTEND lines are parallel")
        require(inter.t2 in -EPS..1.0+EPS) { "EXTEND boundary intersection is outside boundary segment" }
        require(inter.t1 < -EPS || inter.t1 > 1.0+EPS) { "EXTEND target already reaches/crosses boundary" }
        val after=if(inter.t1<0.0) target.copy(a=inter.point) else target.copy(b=inter.point)
        return ReplaceEntitiesCommand(listOf(target),listOf(after))
    }

    private const val MAX_ARRAY_GENERATED_ENTITIES = 10000

    fun offsetCommand(doc: DrawingDocument, ids: Collection<EntityId>, distance: Double): Command {
        require(distance.isFinite() && abs(distance)>=CNC_RESOLUTION_MM) {
            "OFFSET distance must be finite and >= 0.001 mm"
        }
        val selected=ids.distinct().mapNotNull(doc::get)
        require(selected.isNotEmpty()) { "OFFSET requires selected geometry" }

        val selectedIdSet=selected.map{it.id}.toSet()
        val rectRoots=selected.mapNotNull { entity ->
            entity.id.takeIf { it.startsWith("RECT:") }?.substringBeforeLast(':')
        }.toSet()
        val rectGroups=rectRoots.associateWith { root ->
            doc.all().filterIsInstance<Line>().filter { it.id.startsWith("$root:") }
        }
        rectGroups.forEach { (root,lines) ->
            require(lines.size==4 && lines.all{it.id in selectedIdSet}) {
                "OFFSET requires complete RECT group: $root"
            }
            require(lines.map{it.id.substringAfterLast(':')}.toSet()==setOf("0","1","2","3")) {
                "OFFSET RECT semantic edges are incomplete"
            }
            require(lines.all { line ->
                val dx=abs(line.b.x-line.a.x)
                val dy=abs(line.b.y-line.a.y)
                (dx<=EPS && dy>=CNC_RESOLUTION_MM) || (dy<=EPS && dx>=CNC_RESOLUTION_MM)
            }) { "OFFSET RECT supports axis-aligned rectangles only; rotate back to 0/90° first" }
        }

        val idMap=CadSemanticIdentity.copiedIdMap(selected)
        val created=mutableListOf<Entity>()

        rectGroups.forEach { (_,lines) ->
            val pts=lines.flatMap { listOf(it.a,it.b) }
            val minX=pts.minOf{it.x}-distance
            val maxX=pts.maxOf{it.x}+distance
            val minY=pts.minOf{it.y}-distance
            val maxY=pts.maxOf{it.y}+distance
            require(listOf(minX,maxX,minY,maxY).all{it.isFinite()}) { "OFFSET RECT result is non-finite" }
            require(maxX-minX>=CNC_RESOLUTION_MM && maxY-minY>=CNC_RESOLUTION_MM) {
                "OFFSET collapses rectangle"
            }
            val bySuffix=lines.associateBy { it.id.substringAfterLast(':') }
            created += listOf(
                Line(id=idMap.getValue(bySuffix.getValue("0").id),a=Vec2(minX,minY),b=Vec2(maxX,minY)),
                Line(id=idMap.getValue(bySuffix.getValue("1").id),a=Vec2(maxX,minY),b=Vec2(maxX,maxY)),
                Line(id=idMap.getValue(bySuffix.getValue("2").id),a=Vec2(maxX,maxY),b=Vec2(minX,maxY)),
                Line(id=idMap.getValue(bySuffix.getValue("3").id),a=Vec2(minX,maxY),b=Vec2(minX,minY))
            )
        }

        selected.filterNot { entity ->
            val root=entity.id.takeIf { it.startsWith("RECT:") }?.substringBeforeLast(':')
            root!=null && root in rectRoots
        }.forEach { entity ->
            val newId=idMap.getValue(entity.id)
            val shifted:Entity=when(entity) {
                is Line -> {
                    val d=entity.b-entity.a
                    val len=d.length()
                    require(len>=CNC_RESOLUTION_MM) { "OFFSET degenerate line" }
                    val n=Vec2(-d.y/len*distance,d.x/len*distance)
                    Line(id=newId,a=entity.a+n,b=entity.b+n)
                }
                is Circle -> {
                    val r=entity.radius+distance
                    require(r.isFinite() && r>=CNC_RESOLUTION_MM) { "OFFSET collapses circle" }
                    Circle(id=newId,center=entity.center,radius=r)
                }
                is Arc -> {
                    val r=entity.radius+distance
                    require(r.isFinite() && r>=CNC_RESOLUTION_MM) { "OFFSET collapses arc" }
                    val su=(entity.start-entity.center).normalized()
                    val eu=(entity.end-entity.center).normalized()
                    Arc(id=newId,center=entity.center,radius=r,start=entity.center+su*r,end=entity.center+eu*r,clockwise=entity.clockwise)
                }
            }
            require(bounds(shifted).all{it.isFinite()}) { "OFFSET result is non-finite" }
            created += shifted
        }
        return AddEntitiesCommand(created)
    }

    fun linearArrayCommand(doc: DrawingDocument, ids: Collection<EntityId>, count: Int, dx: Double, dy: Double): Command {
        require(count in 2..1000) { "ARRAY count must be 2..1000 total instances" }
        require(dx.isFinite() && dy.isFinite() && (abs(dx)>=CNC_RESOLUTION_MM || abs(dy)>=CNC_RESOLUTION_MM)) {
            "ARRAY step must be finite and at least 0.001 mm"
        }
        val originals=ids.distinct().mapNotNull(doc::get)
        require(originals.isNotEmpty()) { "ARRAY requires selected geometry" }
        val generatedCount=originals.size.toLong()*(count-1L)
        require(generatedCount<=MAX_ARRAY_GENERATED_ENTITIES) {
            "ARRAY would generate $generatedCount entities; limit is $MAX_ARRAY_GENERATED_ENTITIES"
        }
        val maxDx=dx*(count-1)
        val maxDy=dy*(count-1)
        require(maxDx.isFinite() && maxDy.isFinite()) { "ARRAY final step is non-finite" }

        val created=buildList {
            for(k in 1 until count) {
                val idMap=CadSemanticIdentity.copiedIdMap(originals)
                originals.forEach { original ->
                    val copy=moved(original,dx*k,dy*k,false,idMap.getValue(original.id))
                    require(bounds(copy).all{it.isFinite()}) { "ARRAY result is non-finite" }
                    add(copy)
                }
            }
        }
        return AddEntitiesCommand(created)
    }

    fun deleteCommand(ids: Collection<EntityId>): Command = DeleteEntitiesCommand(ids.toSet())

    fun topologyDistance(doc: DrawingDocument, firstId: EntityId, secondId: EntityId): Double {
        val first = doc.get(firstId) ?: error("Topology entity missing: $firstId")
        val second = doc.get(secondId) ?: error("Topology entity missing: $secondId")
        val a = endpoints(first); val b = endpoints(second)
        require(a.isNotEmpty() && b.isNotEmpty()) { "CONNECT requires two open LINE/ARC entities" }
        return a.flatMap { p1 -> b.map { p2 -> p1.distanceTo(p2) } }.minOrNull()
            ?: error("Topology endpoints missing")
    }

    fun connectCommand(doc: DrawingDocument, ids: Collection<EntityId>, tolerance: Double = JOIN_TOLERANCE_MM): Command {
        require(tolerance.isFinite() && tolerance in EPS..JOIN_TOLERANCE_MM) { "CONNECT tolerance must be <= 0.001 mm" }
        val pair = ids.distinct()
        require(pair.size == 2) { "CONNECT requires exactly two selected entities" }
        val gap = topologyDistance(doc,pair[0],pair[1])
        require(gap <= tolerance) { "CONNECT blocked: nearest endpoints ${DisplayFormat.mm(gap)} mm apart" }
        return ConnectTopologyCommand(CadTopologyLink.of(pair[0],pair[1]))
    }
    fun disconnectCommand(doc: DrawingDocument, ids: Collection<EntityId>): Command {
        val pair = ids.distinct()
        require(pair.size == 2) { "DISCONNECT requires exactly two selected entities" }
        return DisconnectTopologyCommand(CadTopologyLink.of(pair[0],pair[1]))
    }

    fun disconnectAllCommand():Command = DisconnectAllTopologyCommand()
}

object CadCamTopologyPolicy {
    const val POLICY="TOPOLOGY_OPTIONAL_FOR_CAM_NC"
    const val TOPOLOGY_REQUIRED_FOR_CAM=false
    const val TOPOLOGY_REQUIRED_FOR_NC=false
    const val GEOMETRY_REMAINS_AUTHORITATIVE=true
    const val POST_VALIDATES_TOOLPATH_AND_NC=true
}

enum class SnapMode { ENDPOINT, MIDPOINT, CENTER, INTERSECTION, TANGENT, HORIZONTAL, VERTICAL }

object CadSemanticIdentity {
    fun newRectIds():List<EntityId> {
        val root="RECT:"+UUID.randomUUID().toString()
        return (0..3).map{"$root:$it"}
    }
    fun newHoleId():EntityId = "HOLE:"+UUID.randomUUID().toString()
    fun semanticKind(entity:Entity):String = when {
        entity.id.startsWith("RECT:") -> "RECT"
        entity.id.startsWith("HOLE:") -> "HOLE"
        entity is Line -> "LINE"
        entity is Circle -> "CIRCLE"
        entity is Arc -> "ARC"
        else -> "UNKNOWN"
    }
    fun selectionIds(doc:DrawingDocument,entity:Entity):Set<EntityId> {
        if(!entity.id.startsWith("RECT:")) return setOf(entity.id)
        val root=entity.id.substringBeforeLast(':')
        return doc.all().map{it.id}.filter{it.startsWith("$root:")}.toSet().ifEmpty{setOf(entity.id)}
    }
    fun copiedIdMap(entities:Collection<Entity>):Map<EntityId,EntityId> {
        val rectRoots=mutableMapOf<String,String>()
        return entities.associate { entity ->
            val id=entity.id
            val newId=when {
                id.startsWith("RECT:") -> {
                    val root=id.substringBeforeLast(':')
                    val suffix=id.substringAfterLast(':')
                    val newRoot=rectRoots.getOrPut(root){"RECT:"+UUID.randomUUID().toString()}
                    "$newRoot:$suffix"
                }
                id.startsWith("HOLE:") -> newHoleId()
                else -> UUID.randomUUID().toString()
            }
            id to newId
        }
    }
}

enum class CadControlPointKind { LINE_START, LINE_END, CENTER, RADIUS, ARC_START, ARC_END, RECT_CORNER }

data class CadControlPoint(
    val entityId:EntityId,
    val kind:CadControlPointKind,
    val point:Vec2
)

object CadControlPointEngine {
    fun points(entity:Entity):List<CadControlPoint> = when(entity) {
        is Line -> listOf(
            CadControlPoint(entity.id,CadControlPointKind.LINE_START,entity.a),
            CadControlPoint(entity.id,CadControlPointKind.LINE_END,entity.b)
        )
        is Circle -> listOf(
            CadControlPoint(entity.id,CadControlPointKind.CENTER,entity.center),
            CadControlPoint(entity.id,CadControlPointKind.RADIUS,entity.center+Vec2(entity.radius,0.0))
        )
        is Arc -> listOf(
            CadControlPoint(entity.id,CadControlPointKind.CENTER,entity.center),
            CadControlPoint(entity.id,CadControlPointKind.ARC_START,entity.start),
            CadControlPoint(entity.id,CadControlPointKind.ARC_END,entity.end)
        )
    }

    private fun rectRoot(id:EntityId):String? =
        id.takeIf { it.startsWith("RECT:") }?.substringBeforeLast(':')

    private fun completeRectLines(doc:DrawingDocument,root:String):List<Line> {
        val lines=doc.all().filterIsInstance<Line>().filter { rectRoot(it.id)==root }
        require(lines.size==4) { "RECT control requires one complete rectangle" }
        val suffixes=lines.map { it.id.substringAfterLast(':') }.toSet()
        require(suffixes==setOf("0","1","2","3")) { "RECT semantic edge IDs are incomplete" }
        require(lines.all { line ->
            val dx=abs(line.b.x-line.a.x)
            val dy=abs(line.b.y-line.a.y)
            (dx<=EPS && dy>=CNC_RESOLUTION_MM) || (dy<=EPS && dx>=CNC_RESOLUTION_MM)
        }) { "RECT corner edit supports axis-aligned rectangles only; rotate back to 0/90° first" }
        return lines
    }

    private fun rectControls(doc:DrawingDocument,root:String):List<CadControlPoint> {
        val lines=completeRectLines(doc,root)
        val points=lines.flatMap { listOf(it.a,it.b) }
        val minX=points.minOf{it.x};val maxX=points.maxOf{it.x}
        val minY=points.minOf{it.y};val maxY=points.maxOf{it.y}
        val representative=lines.minBy { it.id }.id
        return listOf(
            CadControlPoint(representative,CadControlPointKind.RECT_CORNER,Vec2(minX,minY)),
            CadControlPoint(representative,CadControlPointKind.RECT_CORNER,Vec2(maxX,minY)),
            CadControlPoint(representative,CadControlPointKind.RECT_CORNER,Vec2(maxX,maxY)),
            CadControlPoint(representative,CadControlPointKind.RECT_CORNER,Vec2(minX,maxY))
        )
    }

    fun points(doc:DrawingDocument,ids:Collection<EntityId>):List<CadControlPoint> {
        val selected=ids.distinct().mapNotNull(doc::get)
        val rectGroups=selected.filterIsInstance<Line>()
            .mapNotNull { line -> rectRoot(line.id)?.let { it to line } }
            .groupBy({it.first},{it.second})
        val completeRoots=rectGroups.filterValues { it.size==4 }.keys
        val rectPoints=completeRoots.flatMap { root -> rectControls(doc,root) }
        val regular=selected.filter { entity ->
            val root=rectRoot(entity.id)
            root==null || root !in completeRoots
        }.flatMap(::points)
        return rectPoints+regular
    }

    fun nearest(
        doc:DrawingDocument,
        ids:Collection<EntityId>,
        p:Vec2,
        tolerance:Double
    ):CadControlPoint? {
        require(tolerance.isFinite() && tolerance>0.0) { "Control-point tolerance must be positive" }
        return points(doc,ids).minByOrNull { it.point.distanceTo(p) }
            ?.takeIf { it.point.distanceTo(p)<=tolerance }
    }

    fun editCommand(doc:DrawingDocument,control:CadControlPoint,target:Vec2):Command {
        require(target.x.isFinite() && target.y.isFinite()) { "Control-point target must be finite" }
        if(control.kind==CadControlPointKind.RECT_CORNER) {
            val root=rectRoot(control.entityId) ?: error("RECT control identity missing")
            val before=completeRectLines(doc,root)
            val points=before.flatMap { listOf(it.a,it.b) }
            val minX=points.minOf{it.x};val maxX=points.maxOf{it.x}
            val minY=points.minOf{it.y};val maxY=points.maxOf{it.y}
            val left=abs(control.point.x-minX)<=EPS
            val right=abs(control.point.x-maxX)<=EPS
            val bottom=abs(control.point.y-minY)<=EPS
            val top=abs(control.point.y-maxY)<=EPS
            require((left||right)&&(bottom||top)) { "RECT corner no longer matches live geometry" }
            val nextMinX=if(left)target.x else minX
            val nextMaxX=if(right)target.x else maxX
            val nextMinY=if(bottom)target.y else minY
            val nextMaxY=if(top)target.y else maxY
            require(nextMaxX-nextMinX>=CNC_RESOLUTION_MM &&
                nextMaxY-nextMinY>=CNC_RESOLUTION_MM) { "RECT corner edit must keep width/height >= 0.001 mm" }
            val bySuffix=before.associateBy { it.id.substringAfterLast(':') }
            val after=listOf(
                Line(id=bySuffix.getValue("0").id,a=Vec2(nextMinX,nextMinY),b=Vec2(nextMaxX,nextMinY)),
                Line(id=bySuffix.getValue("1").id,a=Vec2(nextMaxX,nextMinY),b=Vec2(nextMaxX,nextMaxY)),
                Line(id=bySuffix.getValue("2").id,a=Vec2(nextMaxX,nextMaxY),b=Vec2(nextMinX,nextMaxY)),
                Line(id=bySuffix.getValue("3").id,a=Vec2(nextMinX,nextMaxY),b=Vec2(nextMinX,nextMinY))
            )
            return ReplaceEntitiesCommand(before,after)
        }

        val before=doc.get(control.entityId) ?: error("Control-point entity missing")
        val after:Entity=when(before) {
            is Line -> when(control.kind) {
                CadControlPointKind.LINE_START -> before.copy(a=target)
                CadControlPointKind.LINE_END -> before.copy(b=target)
                else -> error("Unsupported LINE control point")
            }.also { require(it.length>=CNC_RESOLUTION_MM) { "LINE must remain >= 0.001 mm" } }
            is Circle -> when(control.kind) {
                CadControlPointKind.CENTER -> before.copy(center=target)
                CadControlPointKind.RADIUS -> {
                    val radius=before.center.distanceTo(target)
                    require(radius>=CNC_RESOLUTION_MM) { "CIRCLE radius must remain >= 0.001 mm" }
                    before.copy(radius=radius)
                }
                else -> error("Unsupported CIRCLE control point")
            }
            is Arc -> when(control.kind) {
                CadControlPointKind.CENTER -> {
                    val delta=target-before.center
                    before.copy(center=target,start=before.start+delta,end=before.end+delta)
                }
                CadControlPointKind.ARC_START -> {
                    val dir=target-before.center
                    require(dir.length()>=CNC_RESOLUTION_MM) { "ARC start cannot equal center" }
                    before.copy(start=before.center+dir.normalized()*before.radius)
                }
                CadControlPointKind.ARC_END -> {
                    val dir=target-before.center
                    require(dir.length()>=CNC_RESOLUTION_MM) { "ARC end cannot equal center" }
                    before.copy(end=before.center+dir.normalized()*before.radius)
                }
                else -> error("Unsupported ARC control point")
            }
        }
        return ReplaceEntitiesCommand(listOf(before),listOf(after))
    }
}

object CadSnapEngine {
    private fun tangentPoints(p:Vec2,c:Vec2,r:Double):List<Vec2> {
        val d=p-c
        val d2=d.dot(d)
        if(d2<=r*r+EPS) return emptyList()
        val l=r*r/d2
        val m=r*sqrt(d2-r*r)/d2
        return listOf(
            Vec2(c.x+l*d.x-m*d.y,c.y+l*d.y+m*d.x),
            Vec2(c.x+l*d.x+m*d.y,c.y+l*d.y-m*d.x)
        )
    }

    fun snapTo(
        doc:DrawingDocument,
        p:Vec2,
        tolerance:Double,
        modes:Set<SnapMode> = SnapMode.entries.toSet(),
        reference:Vec2?=null
    ):Vec2? {
        require(tolerance.isFinite() && tolerance>0.0)
        val candidates=mutableListOf<Vec2>()
        reference?.let { ref ->
            if(SnapMode.HORIZONTAL in modes) candidates+=Vec2(p.x,ref.y)
            if(SnapMode.VERTICAL in modes) candidates+=Vec2(ref.x,p.y)
        }
        val entities=doc.all()
        entities.forEach { e ->
            when(e) {
                is Line -> {
                    if(SnapMode.ENDPOINT in modes){ candidates+=e.a; candidates+=e.b }
                    if(SnapMode.MIDPOINT in modes)candidates+=Vec2((e.a.x+e.b.x)/2.0,(e.a.y+e.b.y)/2.0)
                }
                is Circle -> {
                    if(SnapMode.CENTER in modes)candidates+=e.center
                    if(SnapMode.TANGENT in modes)candidates+=tangentPoints(p,e.center,e.radius)
                }
                is Arc -> {
                    if(SnapMode.ENDPOINT in modes){ candidates+=e.start; candidates+=e.end }
                    if(SnapMode.CENTER in modes)candidates+=e.center
                    if(SnapMode.TANGENT in modes)candidates+=tangentPoints(p,e.center,e.radius)
                }
            }
        }
        if(SnapMode.INTERSECTION in modes){
            val lines=entities.filterIsInstance<Line>()
            for(i in lines.indices) for(j in i+1 until lines.size) {
                Geometry.lineIntersection(lines[i],lines[j])?.let { hit ->
                    if(hit.t1 in -EPS..1.0+EPS && hit.t2 in -EPS..1.0+EPS) candidates+=hit.point
                }
            }
        }
        return candidates.minByOrNull{it.distanceTo(p)}?.takeIf{it.distanceTo(p)<=tolerance}
    }
}

object CadSelectionEngine {
    private fun normalize(v:Double):Double {
        var a=v%(2.0*Math.PI)
        if(a<0)a+=2.0*Math.PI
        return a
    }
    private fun onArc(arc:Arc,p:Vec2):Boolean {
        val a=normalize(atan2(p.y-arc.center.y,p.x-arc.center.x))
        val s=normalize(atan2(arc.start.y-arc.center.y,arc.start.x-arc.center.x))
        val e=normalize(atan2(arc.end.y-arc.center.y,arc.end.x-arc.center.x))
        return if(arc.clockwise) normalize(s-a)<=normalize(s-e)+1e-9
        else normalize(a-s)<=normalize(e-s)+1e-9
    }
    fun distanceTo(entity:Entity,p:Vec2):Double = when(entity){
        is Line -> Geometry.distancePointToSegment(p,entity)
        is Circle -> abs(p.distanceTo(entity.center)-entity.radius)
        is Arc -> if(onArc(entity,p)) abs(p.distanceTo(entity.center)-entity.radius)
            else min(p.distanceTo(entity.start),p.distanceTo(entity.end))
    }
    fun nearest(doc:DrawingDocument,p:Vec2,tolerance:Double):Entity? =
        doc.all().map{distanceTo(it,p) to it}.filter{it.first<=tolerance}.minByOrNull{it.first}?.second

    fun semanticKind(entity:Entity):String = CadSemanticIdentity.semanticKind(entity)

    fun selectionIds(doc:DrawingDocument,entity:Entity):Set<EntityId> =
        CadSemanticIdentity.selectionIds(doc,entity)
}

data class RectDrivenSize(val width:Double,val height:Double)

object RectDimensionDriveEngine {
    private fun rectLines(doc:DrawingDocument,ids:Collection<EntityId>):List<Line> {
        val unique=ids.distinct()
        require(unique.size==4) { "RECT dimension requires one complete rectangle" }
        val lines=unique.map { id -> doc.get(id) as? Line ?: error("RECT dimension requires LINE members") }
        val roots=lines.map { it.id.substringBeforeLast(':') }.toSet()
        require(roots.size==1 && lines.all { it.id.startsWith("RECT:") }) { "RECT semantic group is incomplete" }
        require(lines.all { line ->
            val dx=abs(line.b.x-line.a.x)
            val dy=abs(line.b.y-line.a.y)
            (dx<=EPS && dy>=CNC_RESOLUTION_MM) || (dy<=EPS && dx>=CNC_RESOLUTION_MM)
        }) { "RECT dimension supports axis-aligned rectangles only; rotate back to 0/90° first" }
        val suffixes=lines.map { it.id.substringAfterLast(':') }.toSet()
        require(suffixes==setOf("0","1","2","3")) { "RECT semantic edge IDs are incomplete" }
        return lines
    }

    fun current(doc:DrawingDocument,ids:Collection<EntityId>):RectDrivenSize {
        val lines=rectLines(doc,ids)
        val points=lines.flatMap { listOf(it.a,it.b) }
        val width=points.maxOf{it.x}-points.minOf{it.x}
        val height=points.maxOf{it.y}-points.minOf{it.y}
        require(width>=CNC_RESOLUTION_MM && height>=CNC_RESOLUTION_MM) { "RECT dimension is below 0.001 mm" }
        return RectDrivenSize(width,height)
    }

    fun command(doc:DrawingDocument,ids:Collection<EntityId>,width:Double,height:Double):Command {
        require(width.isFinite() && height.isFinite() &&
            width>=CNC_RESOLUTION_MM && height>=CNC_RESOLUTION_MM) {
            "RECT width/height must be finite and >= 0.001 mm"
        }
        val before=rectLines(doc,ids)
        val points=before.flatMap { listOf(it.a,it.b) }
        val cx=(points.minOf{it.x}+points.maxOf{it.x})/2.0
        val cy=(points.minOf{it.y}+points.maxOf{it.y})/2.0
        val minX=cx-width/2.0; val maxX=cx+width/2.0
        val minY=cy-height/2.0; val maxY=cy+height/2.0
        val bySuffix=before.associateBy { it.id.substringAfterLast(':') }
        val after=listOf(
            Line(id=bySuffix.getValue("0").id,a=Vec2(minX,minY),b=Vec2(maxX,minY)),
            Line(id=bySuffix.getValue("1").id,a=Vec2(maxX,minY),b=Vec2(maxX,maxY)),
            Line(id=bySuffix.getValue("2").id,a=Vec2(maxX,maxY),b=Vec2(minX,maxY)),
            Line(id=bySuffix.getValue("3").id,a=Vec2(minX,maxY),b=Vec2(minX,minY))
        )
        return ReplaceEntitiesCommand(before,after)
    }
}

enum class DrivenDimensionKind { LENGTH, DIAMETER, RADIUS }

object DimensionDriveEngine {
    fun defaultKind(entity:Entity):DrivenDimensionKind = when(entity){
        is Line -> DrivenDimensionKind.LENGTH
        is Circle -> DrivenDimensionKind.DIAMETER
        is Arc -> DrivenDimensionKind.RADIUS
    }
    fun currentValue(entity:Entity,kind:DrivenDimensionKind=defaultKind(entity)):Double = when(entity){
        is Line -> {
            require(kind==DrivenDimensionKind.LENGTH)
            entity.length
        }
        is Circle -> when(kind){
            DrivenDimensionKind.RADIUS -> entity.radius
            DrivenDimensionKind.DIAMETER -> entity.radius*2.0
            else -> error("Unsupported circle dimension")
        }
        is Arc -> {
            require(kind==DrivenDimensionKind.RADIUS)
            entity.radius
        }
    }
    fun command(doc:DrawingDocument,id:EntityId,value:Double,kind:DrivenDimensionKind?=null):Command {
        require(value.isFinite() && value>=CNC_RESOLUTION_MM){"Dimension must be >= 0.001 mm"}
        val before=doc.get(id) ?: error("Dimension target not found")
        val actualKind=kind ?: defaultKind(before)
        val after:Entity=when(before){
            is Line -> {
                require(actualKind==DrivenDimensionKind.LENGTH)
                val u=(before.b-before.a).normalized()
                before.copy(b=before.a+u*value)
            }
            is Circle -> {
                val r=when(actualKind){
                    DrivenDimensionKind.RADIUS -> value
                    DrivenDimensionKind.DIAMETER -> value/2.0
                    else -> error("Unsupported circle dimension")
                }
                require(r>=CNC_RESOLUTION_MM)
                before.copy(radius=r)
            }
            is Arc -> {
                require(actualKind==DrivenDimensionKind.RADIUS)
                val su=(before.start-before.center).normalized()
                val eu=(before.end-before.center).normalized()
                before.copy(radius=value,start=before.center+su*value,end=before.center+eu*value)
            }
        }
        return ReplaceEntitiesCommand(listOf(before),listOf(after))
    }
}

fun chamferCommand(doc: DrawingDocument, firstId: EntityId, secondId: EntityId, c: Double): Command {
    val l1 = doc.get(firstId) as? Line ?: error("First entity is not a line")
    val l2 = doc.get(secondId) as? Line ?: error("Second entity is not a line")
    val r = Geometry.chamfer(l1, l2, c)
    return ReplaceEntitiesCommand(listOf(l1, l2), listOf(r.first, r.second, r.bridge))
}

fun filletCommand(doc: DrawingDocument, firstId: EntityId, secondId: EntityId, radius: Double): Command {
    val l1 = doc.get(firstId) as? Line ?: error("First entity is not a line")
    val l2 = doc.get(secondId) as? Line ?: error("Second entity is not a line")
    val r = Geometry.fillet(l1, l2, radius)
    return ReplaceEntitiesCommand(listOf(l1, l2), listOf(r.first, r.second, r.arc))
}
