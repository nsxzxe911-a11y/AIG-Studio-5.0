package com.aigstudio.core

import kotlin.math.*
import java.util.UUID

data class Vec2(val x: Double, val y: Double) {
    operator fun plus(o: Vec2) = Vec2(x + o.x, y + o.y)
    operator fun minus(o: Vec2) = Vec2(x - o.x, y - o.y)
    operator fun times(s: Double) = Vec2(x * s, y * s)
    operator fun div(s: Double) = Vec2(x / s, y / s)
    fun dot(o: Vec2) = x * o.x + y * o.y
    fun cross(o: Vec2) = x * o.y - y * o.x
    fun length() = hypot(x, y)
    fun normalized(): Vec2 {
        val len = length()
        require(len > EPS) { "Zero-length vector" }
        return this / len
    }
    fun distanceTo(o: Vec2) = (this - o).length()
}

const val EPS = 1e-9
const val CNC_RESOLUTION_MM = 0.001
const val MICRON_MM = 0.001
const val MM_PER_TEN_MICRONS = 0.010
const val JOIN_TOLERANCE_MM = 0.001

fun micronUnits(mm: Double): Long = kotlin.math.round(mm / MICRON_MM).toLong()
fun mmFromMicronUnits(units: Long): Double = units * MICRON_MM

typealias EntityId = String

sealed interface Entity { val id: EntityId }

data class Line(
    override val id: EntityId = UUID.randomUUID().toString(),
    val a: Vec2,
    val b: Vec2
) : Entity {
    val length get() = a.distanceTo(b)
}

data class Circle(
    override val id: EntityId = UUID.randomUUID().toString(),
    val center: Vec2,
    val radius: Double
) : Entity {
    init { require(radius > EPS) }
}

data class Arc(
    override val id: EntityId = UUID.randomUUID().toString(),
    val center: Vec2,
    val radius: Double,
    val start: Vec2,
    val end: Vec2,
    val clockwise: Boolean
) : Entity {
    init { require(radius > EPS) }
}

data class Intersection(val point: Vec2, val t1: Double, val t2: Double)

object Geometry {
    fun lineIntersection(l1: Line, l2: Line): Intersection? {
        val r = l1.b - l1.a
        val s = l2.b - l2.a
        val den = r.cross(s)
        if (abs(den) < EPS) return null
        val qmp = l2.a - l1.a
        val t = qmp.cross(s) / den
        val u = qmp.cross(r) / den
        return Intersection(l1.a + r * t, t, u)
    }

    fun closestEndpointIndex(line: Line, p: Vec2): Int =
        if (line.a.distanceTo(p) <= line.b.distanceTo(p)) 0 else 1

    fun inwardDirection(line: Line, intersection: Vec2): Vec2 {
        val da = line.a.distanceTo(intersection)
        val db = line.b.distanceTo(intersection)
        val target = if (da >= db) line.a else line.b
        return (target - intersection).normalized()
    }

    fun replaceCornerEndpoint(line: Line, corner: Vec2, replacement: Vec2): Line {
        return if (closestEndpointIndex(line, corner) == 0) line.copy(a = replacement)
        else line.copy(b = replacement)
    }

    private fun availableFromCorner(line: Line, corner: Vec2): Double {
        val da = line.a.distanceTo(corner)
        val db = line.b.distanceTo(corner)
        return max(da, db)
    }

    private fun requireEditableCorner(line: Line, corner: Vec2) {
        // C/R edits are corner operations.  Reject intersections in the middle of a
        // segment or far outside it; otherwise replacing the nearest endpoint can
        // unexpectedly destroy unrelated geometry.  A tiny tolerance allows lines
        // that visually meet but differ by floating-point noise.
        val endpointGap = min(line.a.distanceTo(corner), line.b.distanceTo(corner))
        val tolerance = JOIN_TOLERANCE_MM
        require(endpointGap <= tolerance) { "Selected lines must meet at their endpoints" }
    }

    fun distancePointToSegment(p: Vec2, l: Line): Double {
        val ab = l.b - l.a
        val denom = ab.dot(ab)
        if (denom < EPS) return p.distanceTo(l.a)
        val t = ((p - l.a).dot(ab) / denom).coerceIn(0.0, 1.0)
        return p.distanceTo(l.a + ab * t)
    }

    fun fillet(l1: Line, l2: Line, radius: Double): FilletResult {
        require(radius > EPS) { "Radius must be positive" }
        val inter = lineIntersection(l1, l2) ?: error("Selected lines are parallel")
        val p = inter.point
        requireEditableCorner(l1, p)
        requireEditableCorner(l2, p)
        val u1 = inwardDirection(l1, p)
        val u2 = inwardDirection(l2, p)
        val dot = u1.dot(u2).coerceIn(-1.0, 1.0)
        val theta = acos(dot)
        require(theta > 1e-6 && theta < Math.PI - 1e-6) { "Fillet angle is invalid" }
        val tangentDistance = radius / tan(theta / 2.0)
        require(tangentDistance <= availableFromCorner(l1, p) + EPS &&
                tangentDistance <= availableFromCorner(l2, p) + EPS) {
            "R value is too large for the selected line lengths"
        }
        val t1 = p + u1 * tangentDistance
        val t2 = p + u2 * tangentDistance
        val bisector = (u1 + u2).normalized()
        val centerDistance = radius / sin(theta / 2.0)
        val center = p + bisector * centerDistance

        // Arc direction in mathematical +Y-up world coordinates.
        val v1 = t1 - center
        val v2 = t2 - center
        val cross = v1.cross(v2)
        val clockwise = cross < 0.0

        return FilletResult(
            replaceCornerEndpoint(l1, p, t1),
            replaceCornerEndpoint(l2, p, t2),
            Arc(center = center, radius = radius, start = t1, end = t2, clockwise = clockwise)
        )
    }

    fun chamfer(l1: Line, l2: Line, distance: Double): ChamferResult {
        require(distance > EPS) { "Chamfer must be positive" }
        val inter = lineIntersection(l1, l2) ?: error("Selected lines are parallel")
        val p = inter.point
        requireEditableCorner(l1, p)
        requireEditableCorner(l2, p)
        val u1 = inwardDirection(l1, p)
        val u2 = inwardDirection(l2, p)
        require(distance <= availableFromCorner(l1, p) + EPS &&
                distance <= availableFromCorner(l2, p) + EPS) {
            "C value is too large for the selected line lengths"
        }
        val t1 = p + u1 * distance
        val t2 = p + u2 * distance
        return ChamferResult(
            replaceCornerEndpoint(l1, p, t1),
            replaceCornerEndpoint(l2, p, t2),
            Line(a = t1, b = t2)
        )
    }
}

data class FilletResult(val first: Line, val second: Line, val arc: Arc)
data class ChamferResult(val first: Line, val second: Line, val bridge: Line)
