package com.aigstudio.core

import java.util.Locale
import kotlin.math.max

enum class DrillCycle(val code: String) { G81("G81"), G73("G73"), G83("G83"), G84("G84") }

enum class CncControllerProfile(val displayName: String, val programLabel: String) {
    FANUC("FANUC", "FANUC"),
    MITSUBISHI_M800_M80("MITSUBISHI M800/M80", "MITSUBISHI M800/M80 ISO")
}

enum class NcCoordinateMode(val code: String, val displayName: String) {
    ABSOLUTE_G90("G90", "G90 ABSOLUTE"),
    INCREMENTAL_G91("G91", "G91 INCREMENTAL")
}

enum class NcOriginTransformMode(val code: String, val displayName: String) {
    WORK_OFFSET_ONLY("G54-G59", "G54-G59 WORK OFFSET"),
    TEMPORARY_G92("G92", "G92 TEMPORARY ORIGIN")
}

enum class CutterCompensationMode(val code: String, val displayName: String) {
    CAM_GEOMETRY_G40("G40", "G40 • CAM GEOMETRY COMP"),
    CONTROLLER_LEFT_G41("G41", "G41 • CONTROLLER LEFT"),
    CONTROLLER_RIGHT_G42("G42", "G42 • CONTROLLER RIGHT")
}

data class NcModalState(
    val coordinateMode: String = "G90",
    val workOffset: String = "G54",
    val temporaryOriginActive: Boolean = false,
    val units: String = "G21",
    val feedMode: String = "G94",
    val cutterCompensation: String = "G40",
    val toolLengthCompensation: String = "G49",
    val plane: String = "G17",
    val coordinateRotation: String = "G69",
    val fixedCycle: String = "G80",
    val cycleReturn: String = "G98",
    val pathControl: String = "G64",
    val spindleSpeedMode: String = "G97",
    val macroMode: String = "G67",
    val fiveAxisToolControl: String = "G49",
    val rotaryWorkOffset: String = "OFF",
    val installErrorComp: String = "OFF",
    val normalLineControl: String = "OFF",
    val threeDCutterComp: String = "OFF",
    val toolAxisDirection: String = "OFF",
    val scalingMode: String = "G50",
    val mirrorMode: String = "G50.1",
    val highAccuracyMode: String = "OFF"
) {
    fun evidence(): String =
        "PROGRAM=" + coordinateMode +
        "|WORK_OFFSET=" + workOffset +
        "|G92=" + if (temporaryOriginActive) "ACTIVE" else "OFF" +
        "|UNITS=" + units +
        "|FEED_MODE=" + feedMode +
        "|CUTTER_COMP=" + cutterCompensation +
        "|TOOL_LENGTH=" + toolLengthCompensation +
        "|PLANE=" + plane +
        "|ROTATION=" + coordinateRotation +
        "|CYCLE=" + fixedCycle +
        "|RETURN=" + cycleReturn +
        "|PATH=" + pathControl +
        "|SPINDLE_MODE=" + spindleSpeedMode +
        "|MACRO=" + macroMode +
        "|TCP=" + fiveAxisToolControl +
        "|ROTARY_WCS=" + rotaryWorkOffset +
        "|INSTALL_COMP=" + installErrorComp +
        "|NORMAL_LINE=" + normalLineControl +
        "|3D_CUTTER_COMP=" + threeDCutterComp +
        "|TOOL_AXIS_DIR=" + toolAxisDirection +
        "|SCALING=" + scalingMode +
        "|MIRROR=" + mirrorMode +
        "|HIGH_ACCURACY=" + highAccuracyMode
}

data class NcModalEvent(
    val lineNumber: Int,
    val code: String,
    val group: String,
    val stateAfter: NcModalState
)

object NcModalTracker {
    private val gCode = Regex("""(?i)(?<![A-Z0-9.])G\s*(\d{1,3}(?:\.\d+)?)(?![0-9.])""")

    private fun normalizeCode(raw: String): String {
        val parts = raw.split('.', limit = 2)
        val head = parts[0].toInt().toString()
        if (parts.size == 1) return "G" + head
        val tail = parts[1].trimEnd('0')
        return if (tail.isEmpty()) "G" + head else "G" + head + "." + tail
    }

    fun codes(program: String): List<Pair<Int,String>> {
        val out = mutableListOf<Pair<Int,String>>()
        program.lineSequence().forEachIndexed { index, raw ->
            val line = raw.substringBefore('(').substringBefore(';')
            gCode.findAll(line).forEach { match ->
                out += (index + 1) to normalizeCode(match.groupValues[1])
            }
        }
        return out
    }

    fun trace(program: String): List<NcModalEvent> {
        var state = NcModalState()
        val events = mutableListOf<NcModalEvent>()
        program.lineSequence().forEachIndexed { index, raw ->
            val line = raw.substringBefore('(').substringBefore(';')
            gCode.findAll(line).forEach { match ->
                val code = normalizeCode(match.groupValues[1])
                val group: String?
                state = when (code) {
                    "G90" -> { group = "PROGRAM_MODE"; state.copy(coordinateMode = "G90") }
                    "G91" -> { group = "PROGRAM_MODE"; state.copy(coordinateMode = "G91") }
                    "G54","G55","G56","G57","G58","G59" -> { group = "WORK_OFFSET"; state.copy(workOffset = code) }
                    "G92" -> { group = "TEMP_ORIGIN"; state.copy(temporaryOriginActive = true) }
                    "G20","G21" -> { group = "UNITS"; state.copy(units = code) }
                    "G93","G94","G95" -> { group = "FEED_MODE"; state.copy(feedMode = code) }
                    "G40","G41","G42" -> { group = "CUTTER_COMP"; state.copy(cutterCompensation = code) }
                    "G43" -> { group = "TOOL_LENGTH"; state.copy(toolLengthCompensation = "G43") }
                    "G43.1","G43.4","G43.5","G43.7" -> {
                        group = "FIVE_AXIS_TOOL_CONTROL"; state.copy(fiveAxisToolControl = code)
                    }
                    "G49" -> {
                        group = "TOOL_LENGTH"; state.copy(toolLengthCompensation = "G49", fiveAxisToolControl = "G49")
                    }
                    "G17","G18","G19" -> { group = "PLANE"; state.copy(plane = code) }
                    "G68" -> { group = "COORD_ROTATION"; state.copy(coordinateRotation = "G68") }
                    "G69" -> { group = "COORD_ROTATION"; state.copy(coordinateRotation = "G69") }
                    "G80","G81","G82","G83","G84","G85","G86","G87","G88","G89" -> {
                        group = "FIXED_CYCLE"; state.copy(fixedCycle = code)
                    }
                    "G98","G99" -> { group = "CYCLE_RETURN"; state.copy(cycleReturn = code) }
                    "G61","G64" -> { group = "PATH_CONTROL"; state.copy(pathControl = code) }
                    "G96","G97" -> { group = "SPINDLE_SPEED_MODE"; state.copy(spindleSpeedMode = code) }
                    "G66","G66.1" -> { group = "MACRO_MODE"; state.copy(macroMode = code) }
                    "G67" -> { group = "MACRO_MODE"; state.copy(macroMode = "G67") }
                    "G4" -> { group = "DWELL_NONMODAL"; state }
                    "G9" -> { group = "EXACT_STOP_NONMODAL"; state }
                    "G28","G29","G30","G30.1","G30.2","G30.3","G30.4","G30.5","G30.6" -> {
                        group = "REFERENCE_RETURN_NONMODAL"; state
                    }
                    "G31","G31.1","G31.2","G31.3" -> { group = "SKIP_NONMODAL"; state }
                    "G52" -> { group = "LOCAL_COORD_TRANSFORM"; state }
                    "G53" -> { group = "MACHINE_COORD_NONMODAL"; state }
                    "G53.1","G53.6" -> { group = "TOOL_AXIS_DIRECTION"; state.copy(toolAxisDirection = code) }
                    "G54.1" -> { group = "EXTENDED_WORK_OFFSET"; state.copy(workOffset = "G54.1") }
                    "G54.2" -> { group = "ROTARY_WORK_OFFSET"; state.copy(rotaryWorkOffset = "G54.2") }
                    "G54.4" -> { group = "WORKPIECE_INSTALL_ERROR_COMP"; state.copy(installErrorComp = "G54.4") }
                    "G40.1","G150" -> { group = "NORMAL_LINE_CONTROL"; state.copy(normalLineControl = "OFF") }
                    "G41.1","G151" -> { group = "NORMAL_LINE_CONTROL"; state.copy(normalLineControl = code) }
                    "G42.1","G152" -> { group = "NORMAL_LINE_CONTROL"; state.copy(normalLineControl = code) }
                    "G41.2","G42.2" -> { group = "THREE_D_CUTTER_COMP"; state.copy(threeDCutterComp = code) }
                    "G50" -> { group = "SCALING"; state.copy(scalingMode = "G50") }
                    "G51" -> { group = "SCALING"; state.copy(scalingMode = "G51") }
                    "G50.1" -> { group = "MIRROR"; state.copy(mirrorMode = "G50.1") }
                    "G51.1" -> { group = "MIRROR"; state.copy(mirrorMode = "G51.1") }
                    "G61.1","G61.2","G61.4" -> { group = "HIGH_ACCURACY_PATH"; state.copy(highAccuracyMode = code) }
                    "G65" -> { group = "MACRO_CALL_NONMODAL"; state }
                    "G68.2","G68.3" -> { group = "INCLINED_SURFACE_TRANSFORM"; state }
                    "G92.1" -> { group = "WORK_COORD_PRESET_NONMODAL"; state }
                    else -> { group = null; state }
                }
                if (group != null) events += NcModalEvent(index + 1, code, group, state)
            }
        }
        return events
    }

    fun finalState(program: String): NcModalState =
        trace(program).lastOrNull()?.stateAfter ?: NcModalState()

    fun evidence(program: String): String = finalState(program).evidence()
}

data class NcModalSafetyFinding(
    val lineNumber: Int,
    val code: String,
    val message: String
)

object NcModalSafetyPolicy {
    private val knownExecutionCodes = setOf(
        "G0","G1","G2","G3","G4","G9",
        "G17","G18","G19","G20","G21",
        "G28","G29","G30","G30.1","G30.2","G30.3","G30.4","G30.5","G30.6",
        "G31","G31.1","G31.2","G31.3",
        "G34",
        "G40","G40.1","G41","G41.1","G41.2","G42","G42.1","G42.2",
        "G43","G43.1","G43.4","G43.5","G43.7","G49",
        "G50","G50.1","G51","G51.1","G52","G53","G53.1","G53.6",
        "G54","G54.1","G54.2","G54.4","G55","G56","G57","G58","G59",
        "G61","G61.1","G61.2","G61.4","G64","G65","G66","G66.1","G67",
        "G68","G68.2","G68.3","G69",
        "G73","G80","G81","G82","G83","G84","G85","G86","G87","G88","G89",
        "G90","G91","G92","G92.1","G93","G94","G95","G96","G97","G98","G99",
        "G150","G151","G152"
    )

    fun blocking(program: String): List<NcModalSafetyFinding> {
        val events = NcModalTracker.trace(program)
        val findings = mutableListOf<NcModalSafetyFinding>()
        fun add(e: NcModalEvent, code: String, message: String) {
            findings += NcModalSafetyFinding(e.lineNumber, code, message)
        }

        events.forEach { e ->
            when (e.code) {
                "G20" -> add(e,"G20_INCH_MODE","Canonical AIG CAD/CAM/SIM data is millimetre based; inch execution is not verified.")
                "G93" -> add(e,"G93_INVERSE_TIME_UNVERIFIED","Inverse-time feed is not yet represented by the current CAM/SIM feed model.")
                "G95" -> add(e,"G95_FEED_PER_REV_UNVERIFIED","Feed-per-revolution is not yet represented by the current CAM/SIM feed model.")
                "G53" -> add(e,"G53_MACHINE_COORD_UNSIMULATED","Machine-coordinate motion bypasses work offsets and is not represented by current CAM/SIM.")
                "G68" -> add(e,"G68_ROTATION_UNSIMULATED","Coordinate rotation is tracked but not yet applied by canonical CAM/SIM.")
                "G92" -> add(e,"G92_ORIGIN_UNVERIFIED","Temporary origin transform is tracked but controller-specific execution semantics are not yet verified.")
                "G41","G42" -> add(e,"G41_G42_DOUBLE_COMP_RISK","Controller cutter compensation is blocked while the current CAM path already contains geometric radius compensation.")
                "G99" -> add(e,"G99_RETURN_UNSIMULATED","R-point canned-cycle return is not yet represented by the current SIM return-path model; generated cycles use explicit G98.")
                "G28","G29","G30","G30.1","G30.2","G30.3","G30.4","G30.5","G30.6" ->
                    add(e,"REFERENCE_RETURN_UNSIMULATED","Reference/start/tool-change position return is tracked but not represented by canonical CAM/SIM machine-coordinate motion.")
                "G31","G31.1","G31.2","G31.3" ->
                    add(e,"SKIP_PROBE_UNSIMULATED","Skip/probe motion depends on external trigger feedback and is not represented by the current deterministic CAM/SIM path.")
                "G52" ->
                    add(e,"G52_LOCAL_COORD_UNVERIFIED","Local coordinate transform is tracked but not yet applied by canonical CAM/SIM.")
                "G65","G66","G66.1" ->
                    add(e,"USER_MACRO_UNEXPANDED","User macro execution can generate hidden motion/state and must be expanded or independently validated before machining.")
                "G68.2","G68.3" ->
                    add(e,"INCLINED_SURFACE_UNSIMULATED","Inclined-surface/3D coordinate transform is tracked but not yet applied by canonical CAM/SIM.")
                "G92.1" ->
                    add(e,"WORK_COORD_PRESET_UNVERIFIED","Work-coordinate preset changes controller coordinate state and is not yet modeled by canonical CAM/SIM.")
                "G96" ->
                    add(e,"G96_CSS_UNVERIFIED","Constant-surface-speed spindle control is not represented by the current fixed-RPM spindle model; generated programs use explicit G97.")
                "G43.1","G43.4","G43.5","G43.7" ->
                    add(e,"FIVE_AXIS_TCP_UNSIMULATED","5-axis tool-axis/TCP compensation is tracked but not yet applied by the canonical AIG 5X CAM/SIM execution model.")
                "G53.1","G53.6" ->
                    add(e,"TOOL_AXIS_DIRECTION_UNSIMULATED","Tool-axis direction control is controller-managed 5X motion and is not yet represented by canonical CAM/SIM.")
                "G54.1" ->
                    add(e,"EXTENDED_WCS_UNVERIFIED","Extended workpiece coordinate selection is tracked but the selected extended offset index is not yet resolved by canonical CAM/SIM.")
                "G54.2" ->
                    add(e,"ROTARY_WCS_OFFSET_UNSIMULATED","Rotary-axis workpiece position offset is not yet represented by canonical 5X CAM/SIM.")
                "G54.4" ->
                    add(e,"WORKPIECE_INSTALL_COMP_UNSIMULATED","Workpiece installation error compensation changes effective 5X coordinates and is not yet represented by canonical CAM/SIM.")
                "G41.1","G42.1","G151","G152" ->
                    add(e,"NORMAL_LINE_CONTROL_UNSIMULATED","Normal-line control changes tool orientation/path behavior and is not yet represented by canonical CAM/SIM.")
                "G41.2","G42.2" ->
                    add(e,"THREE_D_CUTTER_COMP_UNSIMULATED","3D cutter compensation is not yet represented by the current geometrically compensated CAM/SIM model.")
                "G51" ->
                    add(e,"SCALING_UNSIMULATED","Scaling changes effective geometry and is not yet applied by canonical CAM/SIM.")
                "G51.1" ->
                    add(e,"MIRROR_UNSIMULATED","Mirror-image execution changes effective geometry and is not yet applied by canonical CAM/SIM.")
                "G61.1","G61.2","G61.4" ->
                    add(e,"HIGH_ACCURACY_PATH_UNVERIFIED","Controller high-accuracy/path-shaping mode is tracked but not yet represented in AIG path timing/deviation validation.")
            }
        }

        if (events.none { it.code == "G21" }) {
            findings += NcModalSafetyFinding(0,"G21_REQUIRED","Explicit G21 metric mode is required for canonical millimetre coordinate evidence.")
        }
        if (events.none { it.code == "G94" }) {
            findings += NcModalSafetyFinding(0,"G94_REQUIRED","Explicit G94 feed-per-minute mode is required for the current AIG feed model.")
        }
        if (events.none { it.code == "G97" }) {
            findings += NcModalSafetyFinding(0,"G97_REQUIRED","Explicit G97 fixed-RPM mode is required for the current AIG spindle model.")
        }

        NcModalTracker.codes(program).forEach { (line, code) ->
            if (code !in knownExecutionCodes) {
                findings += NcModalSafetyFinding(
                    line,
                    "UNKNOWN_GCODE_FAIL_CLOSED",
                    code + " is not in the current AIG verified/tracked CNC vocabulary; execution is blocked until controller semantics are classified."
                )
            }
        }
        return findings.distinctBy { Triple(it.lineNumber,it.code,it.message) }
    }

    fun status(program: String): String {
        val blocked = blocking(program)
        return if (blocked.isEmpty()) "PASS"
        else "BLOCKED:" + blocked.joinToString(",") { (if (it.lineNumber > 0) "L" + it.lineNumber + ":" else "") + it.code }
    }
}


data class FanucPostSettings(
    val workOffset: String = "G54",
    val tool: Int = 1,
    val h: Int = 1,
    val spindle: Int = 2300,
    val coolant: Boolean = true,
    val toolChangeSubprogram: Int = 4,
    val endSubprogram: Int = 5,
    val axisA: Double = 0.0,
    val axisB: Double = 0.0,
    val controller: CncControllerProfile = CncControllerProfile.FANUC,
    val coordinateMode: NcCoordinateMode = NcCoordinateMode.ABSOLUTE_G90,
    val originTransformMode: NcOriginTransformMode = NcOriginTransformMode.WORK_OFFSET_ONLY,
    val cutterCompensation: CutterCompensationMode = CutterCompensationMode.CAM_GEOMETRY_G40,
    val cutterCompRegister: Int = 1
) {
    init {
        require(Regex("G5[4-9]").matches(workOffset))
        require(tool in 1..999)
        require(h in 1..999)
        require(spindle in 1..99999)
        require(toolChangeSubprogram in 1..9999)
        require(endSubprogram in 1..9999)
        require(axisA in -360.0..360.0)
        require(axisB in -360.0..360.0)
        require(cutterCompRegister in 1..999)
    }
}

data class DrillHole(
    val x: Double,
    val y: Double,
    val z: Double,
    val r: Double,
    val k: Double? = null,
    val feed: Double = 120.0,
    val tapPitchMm: Double? = null,
    val tapSpindleRpm: Int? = null,
    val rigidTapM29: Boolean = false
)

object FanucNc {
    fun generate(cam: CamModel, post: FanucPostSettings = FanucPostSettings()): String {
        require(cam.toolpaths.isNotEmpty()) { "CAM generated no toolpaths" }
        require(post.originTransformMode == NcOriginTransformMode.WORK_OFFSET_ONLY) {
            "G92 output blocked until controller-specific current-position/origin-transform semantics are validated; canonical CAD/CAM/SIM ABS XYZ remains unchanged"
        }
        require(post.cutterCompensation == CutterCompensationMode.CAM_GEOMETRY_G40) {
            "Controller G41/G42 blocked: current CAM toolpath already includes geometric tool-radius compensation; raw contour + controller-comp simulation is required to prevent double compensation"
        }
        if (post.coordinateMode == NcCoordinateMode.INCREMENTAL_G91) {
            require(cam.toolpaths.flatMap { it.moves }.none { it is ArcFeed }) {
                "G91 arc output blocked until controller-specific incremental arc-center semantics are validated"
            }
        }

        val s = cam.settings
        val out = StringBuilder()
        out.appendLine("%")
        out.appendLine("O1000 (AIG CNC " + post.controller.programLabel + ")")
        out.appendLine("(CONTROLLER " + post.controller.displayName + ")")
        out.appendLine("(CANONICAL XYZ ABSOLUTE G90 • MASTER X0.000 Y0.000 Z0.000)")
        out.appendLine("(PROGRAM MODE " + post.coordinateMode.displayName + " • ORIGIN " + post.originTransformMode.displayName + " • CUTTER COMP " + post.cutterCompensation.displayName + ")")
        out.appendLine("G21 G94 G97")
        out.appendLine("G90 " + post.workOffset + " G17 G40 G49 G80")
        out.appendLine("T" + post.tool)
        out.appendLine("M98 P" + post.toolChangeSubprogram)
        out.appendLine("S" + post.spindle + " M3")
        if (kotlin.math.abs(post.axisA) > 1e-9 || kotlin.math.abs(post.axisB) > 1e-9) {
            out.append("G0 A").append(fmt(post.axisA)).append(" B").append(fmt(post.axisB)).appendLine()
        }
        out.append("G43 Z").append(fmt(max(s.safeZ, 30.0))).append(" H").append(post.h)
        if (post.coolant) out.append(" M8")
        out.appendLine()

        val moves = cam.toolpaths.flatMap { it.moves }
        if (post.coordinateMode == NcCoordinateMode.ABSOLUTE_G90) {
            moves.forEach { move ->
                when (move) {
                    is Rapid -> out.append("G0 X").append(fmt(move.to.x)).append(" Y").append(fmt(move.to.y)).append(" Z").append(fmt(move.z)).appendLine()
                    is Feed -> out.append("G1 X").append(fmt(move.to.x)).append(" Y").append(fmt(move.to.y)).append(" Z").append(fmt(move.z))
                        .append(" F").append(fmt(move.feedMmMin)).appendLine()
                    is ArcFeed -> out.append(if (move.clockwise) "G2" else "G3")
                        .append(" X").append(fmt(move.to.x)).append(" Y").append(fmt(move.to.y)).append(" Z").append(fmt(move.z))
                        .append(" I").append(fmt(move.centerOffset.x)).append(" J").append(fmt(move.centerOffset.y))
                        .append(" F").append(fmt(move.feedMmMin)).appendLine()
                }
            }
        } else {
            val first = moves.first()
            when (first) {
                is Rapid -> out.append("G0 X").append(fmt(first.to.x)).append(" Y").append(fmt(first.to.y)).append(" Z").append(fmt(first.z)).appendLine()
                is Feed -> out.append("G1 X").append(fmt(first.to.x)).append(" Y").append(fmt(first.to.y)).append(" Z").append(fmt(first.z))
                    .append(" F").append(fmt(first.feedMmMin)).appendLine()
                is ArcFeed -> error("G91 seed cannot be an arc")
            }
            out.appendLine("G91")
            var previous = first
            moves.drop(1).forEach { move ->
                val dx = move.to.x - previous.to.x
                val dy = move.to.y - previous.to.y
                val dz = move.z - previous.z
                when (move) {
                    is Rapid -> out.append("G0 X").append(fmt(dx)).append(" Y").append(fmt(dy)).append(" Z").append(fmt(dz)).appendLine()
                    is Feed -> out.append("G1 X").append(fmt(dx)).append(" Y").append(fmt(dy)).append(" Z").append(fmt(dz))
                        .append(" F").append(fmt(move.feedMmMin)).appendLine()
                    is ArcFeed -> error("G91 arc output blocked")
                }
                previous = move
            }
            out.appendLine("G90")
        }

        out.appendLine("G0 Z" + fmt(max(s.safeZ, 30.0)))
        out.appendLine("G80")
        out.appendLine("M98 P" + post.endSubprogram)
        out.appendLine("M30")
        out.appendLine("%")
        return out.toString()
    }

    fun cannedCycle(cycle: DrillCycle, holes: List<DrillHole>, safeZ: Double, retractZ: Double = 2.0): String {
        require(holes.isNotEmpty())
        require(safeZ > retractZ && retractZ >= 0.0)
        val out = StringBuilder()
        out.appendLine("G0 Z" + fmt(safeZ))
        holes.forEachIndexed { index, h ->
            require(h.z < 0.0 && h.feed > 0.0)
            if (index == 0) {
                if (cycle == DrillCycle.G84) {
                    val pitch = h.tapPitchMm ?: error("G84 requires tap pitch mm/rev")
                    val rpm = h.tapSpindleRpm ?: error("G84 requires tapping spindle RPM")
                    require(pitch > 0.0 && rpm in 1..99999)
                    if (h.rigidTapM29) out.appendLine("M29 S" + rpm)
                    out.append("G98 G84 X").append(fmt(h.x)).append(" Y").append(fmt(h.y))
                        .append(" Z").append(fmt(h.z)).append(" R").append(fmt(retractZ))
                        .append(" F").append(fmt(pitch * rpm)).appendLine()
                } else {
                    out.append("G98 ").append(cycle.code).append(" X").append(fmt(h.x)).append(" Y").append(fmt(h.y)).append(" Z").append(fmt(h.z)).append(" R").append(fmt(retractZ))
                    if (cycle == DrillCycle.G73 || cycle == DrillCycle.G83) {
                        val q = h.k ?: error(cycle.code + " requires K/Q peck value")
                        require(q > 0.0)
                        out.append(" Q").append(fmt(q))
                    }
                    out.append(" F").append(fmt(h.feed)).appendLine()
                }
            } else out.append("X").append(fmt(h.x)).append(" Y").append(fmt(h.y)).appendLine()
        }
        out.appendLine("G80")
        return out.toString()
    }

    fun insertBeforeProgramEnd(program: String, block: String, endSubprogram: Int = 5): String {
        require(block.isNotBlank()) { "NC block is empty" }
        val normalized = program.replace("\r\n", "\n")
        val marker = "M98 P" + endSubprogram
        val index = normalized.indexOf("\n" + marker + "\n")
        require(index >= 0) { "Fanuc program end marker not found" }
        val before = normalized.substring(0, index + 1).trimEnd()
        val after = normalized.substring(index + 1)
        return before + "\n" + block.trim() + "\n" + after
    }

    fun fmt(v: Double): String {
        var s = String.format(Locale.US, "%.3f", v)
        while (s.contains('.') && s.endsWith('0')) s = s.dropLast(1)
        if (s.endsWith('.')) return s
        if (!s.contains('.')) s += "."
        return s
    }
}

data class MachiningRiskReport(val collisionCount: Int, val overcutCount: Int, val warnings: List<String>) {
    val ok: Boolean get() = collisionCount == 0 && overcutCount == 0
}

object MachiningRiskScanner {
    fun inspect(cam: CamModel, stock: Stock3D): MachiningRiskReport {
        var collisions = 0
        var overcuts = 0
        val warnings = mutableListOf<String>()
        val bottom = -stock.thickness
        cam.toolpaths.forEachIndexed { pathIndex, path ->
            var previous: Move? = null
            path.moves.forEachIndexed { moveIndex, move ->
                if (move.rapid && move.z + 1e-9 < cam.settings.safeZ) {
                    collisions++
                    warnings += "Rapid below Safe-Z at path=" + pathIndex + " move=" + moveIndex
                }
                if (!move.rapid && move.z < bottom - CNC_RESOLUTION_MM) {
                    overcuts++
                    warnings += "Cut below stock bottom at path=" + pathIndex + " move=" + moveIndex
                }

                fun outside(x: Double, y: Double): Boolean =
                    x < stock.minX || x > stock.maxX || y < stock.minY || y > stock.maxY

                var pathOutside = !move.rapid && outside(move.to.x, move.to.y)
                val prev = previous
                if (!move.rapid && move is ArcFeed && prev != null) {
                    val center = prev.to + move.centerOffset
                    val radius = prev.to.distanceTo(center)
                    if (radius > EPS) {
                        val a0 = kotlin.math.atan2(prev.to.y - center.y, prev.to.x - center.x)
                        val a1 = kotlin.math.atan2(move.to.y - center.y, move.to.x - center.x)
                        var sweep = a1 - a0
                        if (move.clockwise) while (sweep >= 0.0) sweep -= 2.0 * Math.PI
                        else while (sweep <= 0.0) sweep += 2.0 * Math.PI
                        val steps = kotlin.math.max(8, kotlin.math.ceil(kotlin.math.abs(sweep) / Math.toRadians(10.0)).toInt())
                        for (i in 0..steps) {
                            val a = a0 + sweep * i / steps
                            if (outside(center.x + radius * kotlin.math.cos(a), center.y + radius * kotlin.math.sin(a))) {
                                pathOutside = true
                                break
                            }
                        }
                    }
                }
                if (pathOutside) {
                    overcuts++
                    warnings += "Cut outside stock XY at path=" + pathIndex + " move=" + moveIndex
                }
                previous = move
            }
        }
        return MachiningRiskReport(collisions, overcuts, warnings.distinct())
    }
}

object CncPost {
    fun generate(cam: CamModel, post: FanucPostSettings = FanucPostSettings()): String =
        FanucNc.generate(cam, post)
}
