package com.aigstudio.core

import java.util.ArrayDeque

class DrawingDocument {
    private val entities = LinkedHashMap<EntityId, Entity>()

    fun all(): List<Entity> = entities.values.toList()
    fun get(id: EntityId): Entity? = entities[id]
    fun put(entity: Entity) { entities[entity.id] = entity }
    fun remove(id: EntityId): Entity? = entities.remove(id)
    fun clear() = entities.clear()
    fun size(): Int = entities.size
    fun snapshot(): DrawingSnapshot = DrawingSnapshot(all().map { it.copyEntity() })
}

data class DrawingSnapshot(val entities: List<Entity>)

private fun Entity.copyEntity(): Entity = when (this) {
    is Line -> copy()
    is Circle -> copy()
    is Arc -> copy()
}

interface Command {
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

    fun undo(): Boolean {
        val c = undoStack.pollLast() ?: return false
        c.undo(doc)
        redoStack.addLast(c)
        return true
    }

    fun redo(): Boolean {
        val c = redoStack.pollLast() ?: return false
        c.execute(doc)
        undoStack.addLast(c)
        return true
    }
}

class AddEntitiesCommand(private val entities: List<Entity>) : Command {
    override fun execute(doc: DrawingDocument) = entities.forEach(doc::put)
    override fun undo(doc: DrawingDocument) { entities.forEach { doc.remove(it.id) } }
}

class DeleteEntityCommand(private val id: EntityId) : Command {
    private var deleted: Entity? = null
    override fun execute(doc: DrawingDocument) {
        deleted = doc.remove(id) ?: error("Entity not found: $id")
    }
    override fun undo(doc: DrawingDocument) { deleted?.let(doc::put) }
}

class ReplaceEntitiesCommand(
    private val before: List<Entity>,
    private val after: List<Entity>
) : Command {
    override fun execute(doc: DrawingDocument) {
        before.forEach { doc.remove(it.id) }
        after.forEach(doc::put)
    }
    override fun undo(doc: DrawingDocument) {
        after.forEach { doc.remove(it.id) }
        before.forEach(doc::put)
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
