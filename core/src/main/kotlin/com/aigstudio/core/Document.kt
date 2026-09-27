package com.aigstudio.core

import java.util.ArrayDeque
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

interface Command {
    val geometryMutation: Boolean get() = true
    fun execute(doc: DrawingDocument)
    fun undo(doc: DrawingDocument)
}

class History(private val doc: DrawingDocument) {
    private val undoStack = ArrayDeque<Command>()
    private val redoStack = ArrayDeque<Command>()

    fun run(command: Command) {
        command.execute(doc)
        undoStack.addLast(command)
        redoStack.clear()
    }
    fun undoWithEffect(): Boolean? {
        val c = undoStack.pollLast() ?: return null
        c.undo(doc)
        redoStack.addLast(c)
        return c.geometryMutation
    }

    fun redoWithEffect(): Boolean? {
        val c = redoStack.pollLast() ?: return null
        c.execute(doc)
        undoStack.addLast(c)
        return c.geometryMutation
    }

    fun undo(): Boolean = undoWithEffect() != null
    fun redo(): Boolean = redoWithEffect() != null
}

class AddEntitiesCommand(private val entities: List<Entity>) : Command {
    override fun execute(doc: DrawingDocument) = entities.forEach(doc::put)
    override fun undo(doc: DrawingDocument) { entities.forEach { doc.remove(it.id) } }
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

    private fun moved(entity: Entity, dx: Double, dy: Double, keepId: Boolean): Entity = when (entity) {
        is Line -> if (keepId) entity.copy(a=entity.a+Vec2(dx,dy), b=entity.b+Vec2(dx,dy))
            else Line(a=entity.a+Vec2(dx,dy), b=entity.b+Vec2(dx,dy))
        is Circle -> if (keepId) entity.copy(center=entity.center+Vec2(dx,dy))
            else Circle(center=entity.center+Vec2(dx,dy), radius=entity.radius)
        is Arc -> if (keepId) entity.copy(center=entity.center+Vec2(dx,dy), start=entity.start+Vec2(dx,dy), end=entity.end+Vec2(dx,dy))
            else Arc(center=entity.center+Vec2(dx,dy), radius=entity.radius, start=entity.start+Vec2(dx,dy), end=entity.end+Vec2(dx,dy), clockwise=entity.clockwise)
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

    fun moveCommand(doc: DrawingDocument, ids: Collection<EntityId>, dx: Double, dy: Double): Command {
        require(dx.isFinite() && dy.isFinite()) { "MOVE delta must be finite" }
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "MOVE requires selected geometry" }
        return ReplaceEntitiesCommand(before, before.map { moved(it,dx,dy,true) })
    }
    fun copyCommand(doc: DrawingDocument, ids: Collection<EntityId>, dx: Double, dy: Double): Command {
        require(dx.isFinite() && dy.isFinite()) { "COPY delta must be finite" }
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "COPY requires selected geometry" }
        return AddEntitiesCommand(before.map { moved(it,dx,dy,false) })
    }

    fun rotateCommand(doc: DrawingDocument, ids: Collection<EntityId>, angleDeg: Double, pivot: Vec2 = selectionCenter(doc,ids)): Command {
        require(angleDeg.isFinite()) { "ROTATE angle must be finite" }
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "ROTATE requires selected geometry" }
        return ReplaceEntitiesCommand(before, before.map { rotated(it,pivot,angleDeg) })
    }

    fun mirrorVerticalCommand(doc: DrawingDocument, ids: Collection<EntityId>, axisX: Double = selectionCenter(doc,ids).x): Command {
        require(axisX.isFinite()) { "MIRROR X axis must be finite" }
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "MIRROR requires selected geometry" }
        return ReplaceEntitiesCommand(before, before.map { mirrored(it,true,axisX) })
    }

    fun mirrorHorizontalCommand(doc: DrawingDocument, ids: Collection<EntityId>, axisY: Double = selectionCenter(doc,ids).y): Command {
        require(axisY.isFinite()) { "MIRROR Y axis must be finite" }
        val before = ids.distinct().mapNotNull(doc::get)
        require(before.isNotEmpty()) { "MIRROR requires selected geometry" }
        return ReplaceEntitiesCommand(before, before.map { mirrored(it,false,axisY) })
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
