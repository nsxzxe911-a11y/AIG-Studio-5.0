package com.aig.core.cad

import kotlin.math.*

enum class CadTool { SELECT, LINE, RECT, CIRCLE, ARC, HOLE, CHAMFER, FILLET, TRIM, EXTEND, OFFSET, ARRAY }
enum class SnapMode { END, MID, CENTER, INTERSECTION, HORIZONTAL, VERTICAL, TANGENT }

data class PointMm(val x: Double, val y: Double)

sealed interface CadEntity

data class CadLine(val a: PointMm, val b: PointMm) : CadEntity
data class CadRect(val a: PointMm, val b: PointMm) : CadEntity
data class CadCircle(val center: PointMm, val radius: Double) : CadEntity
data class CadHole(val center: PointMm, val radius: Double) : CadEntity
data class CadArc(val center: PointMm, val radius: Double, val startDeg: Double, val sweepDeg: Double) : CadEntity
data class CadPolyline(val points: List<PointMm>, val closed: Boolean = true) : CadEntity
data class CadRoundRect(val a: PointMm, val b: PointMm, val radius: Double) : CadEntity

object CadPrecision {
    const val MM = 0.001
    fun q(v: Double) = round(v / MM) * MM
    fun point(x: Double, y: Double) = PointMm(q(x), q(y))
}

class CadDocument {
    var activeTool = CadTool.SELECT
    var snapEnabled = true
    val snaps = SnapMode.entries.toMutableSet()
    private val data = mutableListOf<CadEntity>()
    private val undoStack = mutableListOf<List<CadEntity>>()
    private val redoStack = mutableListOf<List<CadEntity>>()
    val selected = linkedSetOf<Int>()
    val entities: List<CadEntity> get() = data

    private fun checkpoint() {
        undoStack.add(data.toList())
        if (undoStack.size > 64) undoStack.removeAt(0)
        redoStack.clear()
    }

    fun add(entity: CadEntity) {
        checkpoint()
        data.add(entity)
        selected.clear()
        selected.add(data.lastIndex)
    }

    fun undo(): Boolean {
        if (undoStack.isEmpty()) return false
        redoStack.add(data.toList())
        data.clear()
        data.addAll(undoStack.removeAt(undoStack.lastIndex))
        selected.clear()
        return true
    }

    fun redo(): Boolean {
        if (redoStack.isEmpty()) return false
        undoStack.add(data.toList())
        data.clear()
        data.addAll(redoStack.removeAt(redoStack.lastIndex))
        selected.clear()
        return true
    }

    fun clearSelection() = selected.clear()

    fun selectNearest(p: PointMm, tolerance: Double = 8.0): Boolean {
        val index = data.indices.minByOrNull { distance(data[it], p) } ?: return false
        if (distance(data[index], p) > tolerance) return false
        if (!selected.add(index)) selected.remove(index)
        return true
    }

    fun snap(p: PointMm, tolerance: Double = 4.0): PointMm {
        if (!snapEnabled) return p
        val candidate = data.flatMap { entity ->
            when (entity) {
                is CadLine -> listOf(entity.a, entity.b, mid(entity.a, entity.b))
                is CadRect -> listOf(entity.a, entity.b, mid(entity.a, entity.b))
                is CadCircle -> listOf(entity.center)
                is CadHole -> listOf(entity.center)
                is CadArc -> listOf(entity.center)
                is CadPolyline -> entity.points
                is CadRoundRect -> listOf(entity.a, entity.b, mid(entity.a, entity.b))
            }
        }.minByOrNull { hypot(it.x - p.x, it.y - p.y) } ?: return p
        return if (hypot(candidate.x - p.x, candidate.y - p.y) <= tolerance) candidate else p
    }

    fun trimSelected() = mutate { entity ->
        when (entity) {
            is CadLine -> CadLine(entity.a, mid(entity.a, entity.b))
            is CadArc -> entity.copy(sweepDeg = entity.sweepDeg / 2.0)
            else -> entity
        }
    }

    fun extendSelected() = mutate { entity ->
        when (entity) {
            is CadLine -> CadLine(
                entity.a,
                PointMm(
                    entity.a.x + (entity.b.x - entity.a.x) * 1.25,
                    entity.a.y + (entity.b.y - entity.a.y) * 1.25
                )
            )
            is CadArc -> entity.copy(sweepDeg = (entity.sweepDeg * 1.25).coerceIn(-360.0, 360.0))
            else -> entity
        }
    }

    fun offsetSelected(distance: Double = 5.0) = mutate { entity ->
        when (entity) {
            is CadCircle -> entity.copy(radius = (entity.radius + distance).coerceAtLeast(0.001))
            is CadHole -> entity.copy(radius = (entity.radius + distance).coerceAtLeast(0.001))
            is CadArc -> entity.copy(radius = (entity.radius + distance).coerceAtLeast(0.001))
            is CadRect -> CadRect(
                PointMm(entity.a.x - distance, entity.a.y - distance),
                PointMm(entity.b.x + distance, entity.b.y + distance)
            )
            else -> entity
        }
    }

    fun arraySelected(dx: Double = 20.0, dy: Double = 0.0, count: Int = 3): Boolean {
        if (selected.isEmpty()) return false
        checkpoint()
        val source = selected.sorted().map { data[it] }
        selected.clear()
        repeat(count - 1) { k ->
            source.forEach { entity ->
                data.add(translate(entity, dx * (k + 1), dy * (k + 1)))
                selected.add(data.lastIndex)
            }
        }
        return true
    }

    fun chamferSelected(distance: Double = 5.0) = mutate { entity ->
        if (entity !is CadRect) entity else {
            val x0 = min(entity.a.x, entity.b.x)
            val x1 = max(entity.a.x, entity.b.x)
            val y0 = min(entity.a.y, entity.b.y)
            val y1 = max(entity.a.y, entity.b.y)
            val q = min(distance, min(x1 - x0, y1 - y0) / 2.0)
            CadPolyline(
                listOf(
                    PointMm(x0 + q, y0), PointMm(x1 - q, y0), PointMm(x1, y0 + q), PointMm(x1, y1 - q),
                    PointMm(x1 - q, y1), PointMm(x0 + q, y1), PointMm(x0, y1 - q), PointMm(x0, y0 + q)
                )
            )
        }
    }

    fun filletSelected(radius: Double = 5.0) = mutate { entity ->
        if (entity is CadRect) CadRoundRect(entity.a, entity.b, radius) else entity
    }

    private fun mutate(transform: (CadEntity) -> CadEntity): Boolean {
        if (selected.isEmpty()) return false
        checkpoint()
        selected.toList().forEach { index ->
            if (index in data.indices) data[index] = transform(data[index])
        }
        return true
    }

    private fun translate(entity: CadEntity, dx: Double, dy: Double): CadEntity {
        fun p(v: PointMm) = PointMm(v.x + dx, v.y + dy)
        return when (entity) {
            is CadLine -> CadLine(p(entity.a), p(entity.b))
            is CadRect -> CadRect(p(entity.a), p(entity.b))
            is CadCircle -> entity.copy(center = p(entity.center))
            is CadHole -> entity.copy(center = p(entity.center))
            is CadArc -> entity.copy(center = p(entity.center))
            is CadPolyline -> entity.copy(points = entity.points.map { p(it) })
            is CadRoundRect -> entity.copy(a = p(entity.a), b = p(entity.b))
        }
    }

    private fun mid(a: PointMm, b: PointMm) = PointMm((a.x + b.x) / 2.0, (a.y + b.y) / 2.0)

    private fun distance(entity: CadEntity, p: PointMm): Double = when (entity) {
        is CadLine -> hypot(p.x - (entity.a.x + entity.b.x) / 2.0, p.y - (entity.a.y + entity.b.y) / 2.0)
        is CadRect -> hypot(p.x - (entity.a.x + entity.b.x) / 2.0, p.y - (entity.a.y + entity.b.y) / 2.0)
        is CadCircle -> abs(hypot(p.x - entity.center.x, p.y - entity.center.y) - entity.radius)
        is CadHole -> abs(hypot(p.x - entity.center.x, p.y - entity.center.y) - entity.radius)
        is CadArc -> abs(hypot(p.x - entity.center.x, p.y - entity.center.y) - entity.radius)
        is CadPolyline -> entity.points.minOfOrNull { hypot(p.x - it.x, p.y - it.y) } ?: 1e9
        is CadRoundRect -> hypot(p.x - (entity.a.x + entity.b.x) / 2.0, p.y - (entity.a.y + entity.b.y) / 2.0)
    }
}
