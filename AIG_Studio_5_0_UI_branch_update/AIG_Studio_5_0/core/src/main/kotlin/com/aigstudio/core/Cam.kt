package com.aigstudio.core

import kotlin.math.*

data class CamSettings(
    val toolDiameter: Double = 10.0,
    val depth: Double = -2.0,
    val safeZ: Double = 5.0,
    val feedMmMin: Double = 150.0,
    val climb: Boolean = true
) {
    init {
        require(toolDiameter > 0.0) { "Tool diameter must be positive" }
        require(depth < 0.0) { "Cut depth must be below Z0" }
        require(safeZ > 0.0) { "Safe-Z must be positive" }
        require(feedMmMin > 0.0) { "Feed must be positive" }
    }
}

/** CAM receives a read-only geometry snapshot. It never receives DrawingDocument itself. */
class CamModel private constructor(
    val sourceRevision: Long,
    val geometry: DrawingSnapshot,
    val settings: CamSettings,
    val toolpaths: List<Toolpath>
) {
    companion object {
        fun fromCad(
            revision: Long,
            snapshot: DrawingSnapshot,
            settings: CamSettings = CamSettings()
        ): CamModel = CamModel(revision, snapshot, settings, CamEngine.generate(snapshot, settings))
    }
}

data class Toolpath(val moves: List<Move>) {
    init { require(moves.isNotEmpty()) }
}

sealed interface Move {
    val to: Vec2
    val z: Double
    val rapid: Boolean
}

data class Rapid(
    override val to: Vec2,
    override val z: Double = 5.0
) : Move {
    override val rapid: Boolean = true
}

data class Feed(
    override val to: Vec2,
    val feedMmMin: Double,
    override val z: Double = -2.0
) : Move {
    override val rapid: Boolean = false
}

object CamEngine {
    fun generate(snapshot: DrawingSnapshot, settings: CamSettings = CamSettings()): List<Toolpath> {
        if (snapshot.entities.isEmpty()) return emptyList()
        val radiusComp = settings.toolDiameter / 2.0
        val side = if (settings.climb) 1.0 else -1.0
        val output = mutableListOf<Toolpath>()

        fun pathFrom(points: List<Vec2>) {
            if (points.size < 2) return
            val ordered = if (settings.climb) points else points.reversed()
            val moves = mutableListOf<Move>()
            moves += Rapid(ordered.first(), settings.safeZ)
            moves += Feed(ordered.first(), settings.feedMmMin, settings.depth)
            ordered.drop(1).forEach { moves += Feed(it, settings.feedMmMin, settings.depth) }
            moves += Rapid(ordered.last(), settings.safeZ)
            output += Toolpath(moves)
        }

        for (entity in snapshot.entities) {
            when (entity) {
                is Line -> {
                    val d = entity.b - entity.a
                    val len = d.length()
                    if (len < CNC_RESOLUTION_MM) continue
                    val nx = -d.y / len * radiusComp * side
                    val ny = d.x / len * radiusComp * side
                    pathFrom(listOf(
                        Vec2(entity.a.x + nx, entity.a.y + ny),
                        Vec2(entity.b.x + nx, entity.b.y + ny)
                    ))
                }
                is Circle -> {
                    val r = entity.radius + radiusComp
                    val segments = 72
                    val points = (0..segments).map { i ->
                        val a = 2.0 * Math.PI * i / segments
                        Vec2(entity.center.x + r * cos(a), entity.center.y + r * sin(a))
                    }
                    pathFrom(points)
                }
                is Arc -> {
                    val r = entity.radius + radiusComp
                    val startA = atan2(entity.start.y - entity.center.y, entity.start.x - entity.center.x)
                    val endA = atan2(entity.end.y - entity.center.y, entity.end.x - entity.center.x)
                    var sweep = endA - startA
                    if (entity.clockwise) {
                        while (sweep >= 0.0) sweep -= 2.0 * Math.PI
                    } else {
                        while (sweep <= 0.0) sweep += 2.0 * Math.PI
                    }
                    val segments = max(8, ceil(abs(sweep) / Math.toRadians(5.0)).toInt())
                    val points = (0..segments).map { i ->
                        val a = startA + sweep * i / segments
                        Vec2(entity.center.x + r * cos(a), entity.center.y + r * sin(a))
                    }
                    pathFrom(points)
                }
            }
        }
        return output
    }
}
