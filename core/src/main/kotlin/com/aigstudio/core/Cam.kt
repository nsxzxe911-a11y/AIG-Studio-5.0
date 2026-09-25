package com.aigstudio.core

import kotlin.math.*

data class CamSettings(
    val toolDiameter: Double = 10.0,
    val depth: Double = -2.0,
    val safeZ: Double = 5.0,
    val feedMmMin: Double = 150.0,
    val climb: Boolean = true,
    val leadInMm: Double = 2.0,
    val leadOutMm: Double = 2.0
) {
    init {
        require(toolDiameter > 0.0) { "Tool diameter must be positive" }
        require(depth < 0.0) { "Cut depth must be below Z0" }
        require(safeZ > 0.0) { "Safe-Z must be positive" }
        require(feedMmMin > 0.0) { "Feed must be positive" }
        require(leadInMm >= 0.0 && leadOutMm >= 0.0) { "Lead-in/out must be non-negative" }
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
            settings: CamSettings = CamSettings(),
            axisA: Double = 0.0,
            axisB: Double = 0.0
        ): CamModel = CamModel(revision, snapshot, settings, CamEngine.generate(snapshot, settings, axisA, axisB))
    }
}

data class Toolpath(val moves: List<Move>) {
    init { require(moves.isNotEmpty()) }
}

sealed interface Move {
    val to: Vec2
    val z: Double
    val rapid: Boolean
    val axisA: Double
    val axisB: Double
}

data class Rapid(
    override val to: Vec2,
    override val z: Double = 5.0,
    override val axisA: Double = 0.0,
    override val axisB: Double = 0.0
) : Move {
    override val rapid: Boolean = true
}

data class Feed(
    override val to: Vec2,
    val feedMmMin: Double,
    override val z: Double = -2.0,
    override val axisA: Double = 0.0,
    override val axisB: Double = 0.0
) : Move {
    override val rapid: Boolean = false
}

data class ArcFeed(
    override val to: Vec2,
    val centerOffset: Vec2,
    val clockwise: Boolean,
    val feedMmMin: Double,
    override val z: Double = -2.0,
    override val axisA: Double = 0.0,
    override val axisB: Double = 0.0
) : Move {
    override val rapid: Boolean = false
}

object CamEngine {
    fun generate(
        snapshot: DrawingSnapshot,
        settings: CamSettings = CamSettings(),
        axisA: Double = 0.0,
        axisB: Double = 0.0
    ): List<Toolpath> {
        require(axisA.isFinite() && axisB.isFinite() && abs(axisA) <= 360.0 && abs(axisB) <= 360.0) {
            "Unsafe CAM A/B orientation"
        }
        if (snapshot.entities.isEmpty()) return emptyList()
        val radiusComp = settings.toolDiameter / 2.0
        val side = if (settings.climb) 1.0 else -1.0
        val output = mutableListOf<Toolpath>()

        fun arcPath(center: Vec2, radius: Double, startAngle: Double, sweep: Double) {
            if (radius <= CNC_RESOLUTION_MM || abs(sweep) <= 1e-12) return
            val directionSweep = if (settings.climb) sweep else -sweep
            val actualStart = if (settings.climb) startAngle else startAngle + sweep
            val start = Vec2(center.x + radius * cos(actualStart), center.y + radius * sin(actualStart))
            val leadStartAngle = actualStart
            val tangent = Vec2(-sin(leadStartAngle), cos(leadStartAngle)) * if (directionSweep >= 0.0) 1.0 else -1.0
            val leadIn = if (settings.leadInMm > 0.0) start - tangent * settings.leadInMm else start
            val moves = mutableListOf<Move>()
            moves += Rapid(leadIn, settings.safeZ)
            moves += Feed(leadIn, settings.feedMmMin, settings.depth)
            if (leadIn.distanceTo(start) >= CNC_RESOLUTION_MM) moves += Feed(start, settings.feedMmMin, settings.depth)

            val maxSweep = Math.PI
            val segments = max(1, ceil(abs(directionSweep) / maxSweep).toInt())
            var current = start
            for (i in 1..segments) {
                val a = actualStart + directionSweep * i / segments
                val next = Vec2(center.x + radius * cos(a), center.y + radius * sin(a))
                moves += ArcFeed(
                    to = next,
                    centerOffset = center - current,
                    clockwise = directionSweep < 0.0,
                    feedMmMin = settings.feedMmMin,
                    z = settings.depth
                )
                current = next
            }

            val endAngle = actualStart + directionSweep
            val end = Vec2(center.x + radius * cos(endAngle), center.y + radius * sin(endAngle))
            val endTangent = Vec2(-sin(endAngle), cos(endAngle)) * if (directionSweep >= 0.0) 1.0 else -1.0
            if (current.distanceTo(end) >= CNC_RESOLUTION_MM) {
                moves += ArcFeed(
                    to = end,
                    centerOffset = center - current,
                    clockwise = directionSweep < 0.0,
                    feedMmMin = settings.feedMmMin,
                    z = settings.depth
                )
            }
            val leadOut = if (settings.leadOutMm > 0.0) end + endTangent * settings.leadOutMm else end
            if (leadOut.distanceTo(end) >= CNC_RESOLUTION_MM) moves += Feed(leadOut, settings.feedMmMin, settings.depth)
            moves += Rapid(leadOut, settings.safeZ)
            output += Toolpath(moves)
        }

        fun pathFrom(points: List<Vec2>) {
            if (points.size < 2) return
            val ordered = if (settings.climb) points else points.reversed()
            val moves = mutableListOf<Move>()
            val first = ordered.first()
            val second = ordered.getOrElse(1) { first }
            val last = ordered.last()
            val beforeLast = ordered.getOrElse(ordered.lastIndex - 1) { last }
            fun offsetFrom(a: Vec2, b: Vec2, distance: Double): Vec2 {
                val dx = b.x - a.x
                val dy = b.y - a.y
                val len = hypot(dx, dy)
                if (len < CNC_RESOLUTION_MM || distance <= 0.0) return a
                return Vec2(a.x - dx / len * distance, a.y - dy / len * distance)
            }
            fun offsetPast(a: Vec2, b: Vec2, distance: Double): Vec2 {
                val dx = b.x - a.x
                val dy = b.y - a.y
                val len = hypot(dx, dy)
                if (len < CNC_RESOLUTION_MM || distance <= 0.0) return b
                return Vec2(b.x + dx / len * distance, b.y + dy / len * distance)
            }
            val leadIn = offsetFrom(first, second, settings.leadInMm)
            val leadOut = offsetPast(beforeLast, last, settings.leadOutMm)
            moves += Rapid(leadIn, settings.safeZ)
            moves += Feed(leadIn, settings.feedMmMin, settings.depth)
            if (leadIn.distanceTo(first) >= CNC_RESOLUTION_MM) moves += Feed(first, settings.feedMmMin, settings.depth)
            ordered.drop(1).forEach { moves += Feed(it, settings.feedMmMin, settings.depth) }
            if (leadOut.distanceTo(last) >= CNC_RESOLUTION_MM) moves += Feed(leadOut, settings.feedMmMin, settings.depth)
            moves += Rapid(leadOut, settings.safeZ)
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
                    arcPath(entity.center, r, 0.0, 2.0 * Math.PI)
                }
                is Arc -> {
                    val r = entity.radius + radiusComp
                    val startA = atan2(entity.start.y - entity.center.y, entity.start.x - entity.center.x)
                    val endA = atan2(entity.end.y - entity.center.y, entity.end.x - entity.center.x)
                    var sweep = endA - startA
                    if (entity.clockwise) while (sweep >= 0.0) sweep -= 2.0 * Math.PI
                    else while (sweep <= 0.0) sweep += 2.0 * Math.PI
                    arcPath(entity.center, r, startA, sweep)
                }
            }
        }
        return output.map { path ->
            Toolpath(path.moves.map { move ->
                when (move) {
                    is Rapid -> move.copy(axisA=axisA,axisB=axisB)
                    is Feed -> move.copy(axisA=axisA,axisB=axisB)
                    is ArcFeed -> move.copy(axisA=axisA,axisB=axisB)
                }
            })
        }
    }
}
