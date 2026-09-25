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

object SoftwareCoordinateContract {
    private const val MASTER_ORIGIN_MM = 0.0

    fun coordinateMode(): String = "G90"
    fun masterOriginX(): Double = MASTER_ORIGIN_MM
    fun masterOriginY(): Double = MASTER_ORIGIN_MM
    fun masterOriginZ(): Double = MASTER_ORIGIN_MM
    fun originDisplay(): String = DisplayFormat.mm(MASTER_ORIGIN_MM)
    fun masterOriginData(): String = xyzData(MASTER_ORIGIN_MM, MASTER_ORIGIN_MM, MASTER_ORIGIN_MM)
    fun displayResolutionMm(): Double = CNC_RESOLUTION_MM
    fun machineOffsetAffectsGeometry(): Boolean = false
    fun simulationAppliesWorkOffset(): Boolean = false
    fun simulationUsesToleranceCompensation(): Boolean = false
    fun preserveSignedCoordinates(): Boolean = true
    fun canonicalCoordinateTruth(): String = "CAD/CAM/SIM ABS G90 • MASTER X0.000 Y0.000 Z0.000"
    fun coordinateResponsibilityLayers(): List<String> = listOf(
        "GEOMETRY=CANONICAL_ABS_XYZ",
        "PROGRAM_MODE=G90_OR_G91_REPRESENTATION",
        "UNITS=G20_G21_INTERPRETATION_LAYER",
        "FEED_MODE=G93_G94_G95_EXECUTION_LAYER",
        "SPINDLE_MODE=G96_G97_EXECUTION_LAYER",
        "WORK_OFFSET=G54_G59_NC_EXECUTION_LAYER",
        "EXTENDED_WCS=G54_1_CONTROLLER_OFFSET_LAYER",
        "ROTARY_WCS_OFFSET=G54_2_5X_TRANSFORM_LAYER",
        "WORKPIECE_INSTALL_COMP=G54_4_5X_TRANSFORM_LAYER",
        "LOCAL_COORD=G52_TRANSFORM_LAYER",
        "MACHINE_COORD=G53_NONMODAL_EXECUTION_LAYER",
        "TOOL_AXIS_DIRECTION=G53_1_G53_6_5X_CONTROL_LAYER",
        "REFERENCE_RETURN=G28_G29_G30_NONMODAL_LAYER",
        "TEMP_ORIGIN=G92_NC_TRANSFORM_LAYER",
        "WORK_COORD_PRESET=G92_1_CONTROLLER_STATE_LAYER",
        "COORD_ROTATION=G68_G69_TRANSFORM_LAYER",
        "INCLINED_SURFACE=G68_2_G68_3_TRANSFORM_LAYER",
        "FIVE_AXIS_TCP=G43_1_G43_4_G43_5_G43_7_CONTROL_LAYER",
        "CUTTER_COMP=G40_G41_G42_EXPLICIT",
        "NORMAL_LINE_CONTROL=G40_1_G41_1_G42_1_G150_G151_G152_LAYER",
        "THREE_D_CUTTER_COMP=G41_2_G42_2_LAYER",
        "TOOL_LENGTH=G43_G49_H_EXPLICIT",
        "SCALING=G50_G51_GEOMETRY_TRANSFORM_LAYER",
        "MIRROR=G50_1_G51_1_GEOMETRY_TRANSFORM_LAYER",
        "PROBE_SKIP=G31_TRIGGERED_MOTION_LAYER",
        "USER_MACRO=G65_G66_G67_EXECUTION_LAYER",
        "FIXED_CYCLE=G80_G89_MODAL_LAYER",
        "CYCLE_RETURN=G98_G99_RETRACT_LAYER",
        "PATH_CONTROL=G61_G64_MOTION_LAYER",
        "HIGH_ACCURACY_PATH=G61_1_G61_2_G61_4_CONTROLLER_LAYER",
        "NONMODAL_TIMING=G04_G09_EXECUTION_LAYER",
        "CONTROLLER=POST_PROFILE_ONLY"
    )
    fun machineAuxiliaryResponsibilityLayers(): List<String> = listOf(
        "SPINDLE=M3_M4_M5_EXECUTION_LAYER",
        "COOLANT=M7_M8_M9_EXECUTION_LAYER",
        "TOOL_CHANGE=M6_NONMODAL_LAYER",
        "SPINDLE_ORIENT=M19_CONTROLLER_LAYER",
        "PROGRAM_STOP=M0_M1_CONTROL_LAYER",
        "SUBPROGRAM=M98_M99_CALL_RETURN_LAYER",
        "PROGRAM_END=M2_M30_CONTROL_LAYER"
    )
    fun coordinateUsageGuidance(): List<String> = listOf(
        "GENERAL_MACHINING=G90",
        "REPEATED_POCKET_PATTERN=G91",
        "SUBPROGRAM_MACRO=G91",
        "ANGULAR_FEATURE_TEMP_ORIGIN=G92",
        "MULTI_FIXTURE_TEMP_ORIGIN=G92",
        "COPY_PASTE_PROGRAM_BLOCK=G90"
    )
    fun xyzData(x: Double, y: Double, z: Double): String =
        "X" + DisplayFormat.mm(x) + " Y" + DisplayFormat.mm(y) + " Z" + DisplayFormat.mm(z)
}

fun micronUnits(mm: Double): Long = kotlin.math.round(mm / MICRON_MM).toLong()
fun mmFromMicronUnits(units: Long): Double = units * MICRON_MM

object DisplayFormat {
    fun mm(v: Double): String = java.lang.String.format(java.util.Locale.US, "%.3f", v)
}

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
