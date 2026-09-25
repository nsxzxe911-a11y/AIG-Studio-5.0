package com.aigstudio.core

import java.util.Locale
import kotlin.math.max

enum class DrillCycle(val code: String) { G81("G81"), G73("G73"), G83("G83"), G84("G84") }

enum class CncControllerProfile(val displayName: String, val programLabel: String) {
    FANUC("FANUC", "FANUC"),
    MITSUBISHI_M800_M80("MITSUBISHI M800/M80", "MITSUBISHI M800/M80 ISO")
}


enum class ControllerCapabilityStatus {
    MODELED_ALLOWED,
    TRACKED_REVIEW,
    UNKNOWN_FAIL_CLOSED
}

data class ControllerCapabilityDecision(
    val controller: CncControllerProfile,
    val code: String,
    val status: ControllerCapabilityStatus,
    val reason: String
)

object CncControllerCapabilityMatrix {
    private val modeledAllowed = setOf(
        "G0","G1","G2","G3",
        "G17","G21","G34",
        "G40","G43","G49",
        "G54","G55","G56","G57","G58","G59",
        "G73","G80","G81","G83","G84",
        "G90","G91","G94","G97","G98",
        "M3","M5","M6","M8","M9","M98","M99","M30"
    )

    private val trackedReview = setOf(
        "G4","G9","G18","G19","G20",
        "G28","G29","G30","G30.1","G30.2","G30.3","G30.4","G30.5","G30.6",
        "G31","G31.1","G31.2","G31.3",
        "G40.1","G41","G41.1","G41.2","G42","G42.1","G42.2",
        "G43.1","G43.4","G43.5","G43.7",
        "G50","G50.1","G51","G51.1","G52","G53","G53.1","G53.6",
        "G54.1","G54.2","G54.4",
        "G61","G61.1","G61.2","G61.4","G64",
        "G65","G66","G66.1","G67",
        "G68","G68.2","G68.3","G69",
        "G82","G85","G86","G87","G88","G89",
        "G92","G92.1","G93","G95","G96","G99",
        "G150","G151","G152",
        "M0","M1","M2","M4","M7","M19"
    )

    fun classify(controller: CncControllerProfile, code: String): ControllerCapabilityDecision {
        val normalized = code.uppercase()
        return when {
            normalized in modeledAllowed -> ControllerCapabilityDecision(
                controller,
                normalized,
                ControllerCapabilityStatus.MODELED_ALLOWED,
                "AIG canonical post/CAM-SIM contract has an explicit modeled path for this code; context-specific safety rules still apply."
            )
            normalized in trackedReview -> ControllerCapabilityDecision(
                controller,
                normalized,
                ControllerCapabilityStatus.TRACKED_REVIEW,
                "AIG recognizes this controller code; consult the modal safety result to see whether the current CAM/SIM model permits or blocks this use."
            )
            else -> ControllerCapabilityDecision(
                controller,
                normalized,
                ControllerCapabilityStatus.UNKNOWN_FAIL_CLOSED,
                "Code is not classified for this controller profile."
            )
        }
    }

    fun summary(controller: CncControllerProfile, program: String): String {
        val decisions = (NcModalTracker.codes(program) + NcAuxiliaryTracker.codes(program))
            .map { classify(controller,it.second) }
        val allowed = decisions.count { it.status == ControllerCapabilityStatus.MODELED_ALLOWED }
        val tracked = decisions.count { it.status == ControllerCapabilityStatus.TRACKED_REVIEW }
        val unknown = decisions.count { it.status == ControllerCapabilityStatus.UNKNOWN_FAIL_CLOSED }
        return "CTRL=" + controller.displayName +
            "|MODELED=" + allowed +
            "|TRACKED_REVIEW=" + tracked +
            "|UNKNOWN_BLOCK=" + unknown
    }
}


data class NcCodeDescriptor(
    val code: String,
    val shortName: String,
    val layer: String,
    val meaning: String
) {
    fun compact(): String = code + "=" + shortName
}

object NcCodeCatalog {
    fun describe(rawCode: String): NcCodeDescriptor {
        val code = rawCode.uppercase()
        return when (code) {
            "G0" -> NcCodeDescriptor(code,"RAPID","MOTION","Rapid positioning")
            "G1" -> NcCodeDescriptor(code,"LINE","MOTION","Linear interpolation")
            "G2" -> NcCodeDescriptor(code,"ARC-CW","MOTION","Clockwise circular interpolation")
            "G3" -> NcCodeDescriptor(code,"ARC-CCW","MOTION","Counter-clockwise circular interpolation")
            "G4" -> NcCodeDescriptor(code,"DWELL","TIMING","Dwell")
            "G9" -> NcCodeDescriptor(code,"EXACT","PATH","Exact stop")
            "G17" -> NcCodeDescriptor(code,"XY","PLANE","XY plane")
            "G18" -> NcCodeDescriptor(code,"XZ","PLANE","XZ plane")
            "G19" -> NcCodeDescriptor(code,"YZ","PLANE","YZ plane")
            "G20" -> NcCodeDescriptor(code,"INCH","UNITS","Inch units")
            "G21" -> NcCodeDescriptor(code,"MM","UNITS","Millimetre units")
            "G28" -> NcCodeDescriptor(code,"REF-1","REFERENCE","Reference return")
            "G29" -> NcCodeDescriptor(code,"REF-FROM","REFERENCE","Return from reference position")
            "G30" -> NcCodeDescriptor(code,"REF-2","REFERENCE","Second reference return")
            "G30.1","G30.2","G30.3","G30.4","G30.5","G30.6" ->
                NcCodeDescriptor(code,"REF-X","REFERENCE","Extended reference return")
            "G31","G31.1","G31.2","G31.3" ->
                NcCodeDescriptor(code,"SKIP","PROBE","Skip/probe triggered motion")
            "G34" -> NcCodeDescriptor(code,"HOLE-CIRCLE","DRILL","AIG circular-hole pattern")
            "G40" -> NcCodeDescriptor(code,"COMP-OFF","CUTTER_COMP","Cutter compensation cancel")
            "G41" -> NcCodeDescriptor(code,"L-COMP","CUTTER_COMP","Controller cutter compensation left")
            "G42" -> NcCodeDescriptor(code,"R-COMP","CUTTER_COMP","Controller cutter compensation right")
            "G40.1","G150" -> NcCodeDescriptor(code,"NORM-OFF","5X_ORIENTATION","Normal-line control cancel")
            "G41.1","G151" -> NcCodeDescriptor(code,"NORM-L","5X_ORIENTATION","Normal-line control left")
            "G42.1","G152" -> NcCodeDescriptor(code,"NORM-R","5X_ORIENTATION","Normal-line control right")
            "G41.2" -> NcCodeDescriptor(code,"3D-L","3D_COMP","3D cutter compensation left")
            "G42.2" -> NcCodeDescriptor(code,"3D-R","3D_COMP","3D cutter compensation right")
            "G43" -> NcCodeDescriptor(code,"TLEN","TOOL_LENGTH","Tool length compensation positive")
            "G43.1" -> NcCodeDescriptor(code,"TAXIS","5X_TCP","Tool-axis control")
            "G43.4" -> NcCodeDescriptor(code,"TCP","5X_TCP","Tool center point control")
            "G43.5" -> NcCodeDescriptor(code,"TCP-V","5X_TCP","Vector/tool center point control")
            "G43.7" -> NcCodeDescriptor(code,"TCP-X","5X_TCP","Extended tool center control")
            "G49" -> NcCodeDescriptor(code,"TLEN-OFF","TOOL_LENGTH","Tool length compensation cancel")
            "G50" -> NcCodeDescriptor(code,"SCALE-OFF","GEOMETRY_XFORM","Scaling cancel")
            "G51" -> NcCodeDescriptor(code,"SCALE","GEOMETRY_XFORM","Scaling")
            "G50.1" -> NcCodeDescriptor(code,"MIRROR-OFF","GEOMETRY_XFORM","Mirror cancel")
            "G51.1" -> NcCodeDescriptor(code,"MIRROR","GEOMETRY_XFORM","Mirror image")
            "G52" -> NcCodeDescriptor(code,"LOCAL","COORD_XFORM","Local coordinate system")
            "G53" -> NcCodeDescriptor(code,"MACHINE","COORD_XFORM","Machine coordinate move")
            "G53.1","G53.6" -> NcCodeDescriptor(code,"TAXIS-DIR","5X_ORIENTATION","Tool-axis direction control")
            "G54","G55","G56","G57","G58","G59" ->
                NcCodeDescriptor(code,"WCS","WORK_OFFSET","Work coordinate system")
            "G54.1" -> NcCodeDescriptor(code,"WCS-EXT","WORK_OFFSET","Extended work coordinate system")
            "G54.2" -> NcCodeDescriptor(code,"ROT-WCS","5X_OFFSET","Rotary-axis workpiece offset")
            "G54.4" -> NcCodeDescriptor(code,"INSTALL-COMP","5X_OFFSET","Workpiece installation error compensation")
            "G61" -> NcCodeDescriptor(code,"EXACT-MODE","PATH","Exact stop mode")
            "G61.1","G61.2","G61.4" -> NcCodeDescriptor(code,"HI-ACC","PATH","Controller high-accuracy path mode")
            "G64" -> NcCodeDescriptor(code,"CONT","PATH","Continuous cutting mode")
            "G65" -> NcCodeDescriptor(code,"MACRO-CALL","MACRO","Non-modal macro call")
            "G66","G66.1" -> NcCodeDescriptor(code,"MACRO-MOD","MACRO","Modal macro call")
            "G67" -> NcCodeDescriptor(code,"MACRO-OFF","MACRO","Modal macro cancel")
            "G68" -> NcCodeDescriptor(code,"ROTATE","COORD_XFORM","Coordinate rotation")
            "G69" -> NcCodeDescriptor(code,"ROT-OFF","COORD_XFORM","Coordinate rotation cancel")
            "G68.2","G68.3" -> NcCodeDescriptor(code,"TILT-PLANE","5X_XFORM","Inclined-surface coordinate transform")
            "G73" -> NcCodeDescriptor(code,"PECK-HS","CYCLE","High-speed peck drilling")
            "G80" -> NcCodeDescriptor(code,"CYCLE-OFF","CYCLE","Fixed cycle cancel")
            "G81" -> NcCodeDescriptor(code,"DRILL","CYCLE","Drilling cycle")
            "G82" -> NcCodeDescriptor(code,"DRILL-DWELL","CYCLE","Drilling with dwell")
            "G83" -> NcCodeDescriptor(code,"PECK","CYCLE","Peck drilling cycle")
            "G84" -> NcCodeDescriptor(code,"TAP","CYCLE","Tapping cycle")
            "G85" -> NcCodeDescriptor(code,"BORE-FEED","CYCLE","Boring feed/feed")
            "G86" -> NcCodeDescriptor(code,"BORE-STOP","CYCLE","Boring with spindle stop")
            "G87" -> NcCodeDescriptor(code,"BACK-BORE","CYCLE","Back boring")
            "G88" -> NcCodeDescriptor(code,"BORE-MAN","CYCLE","Boring/manual return")
            "G89" -> NcCodeDescriptor(code,"BORE-DWELL","CYCLE","Boring with dwell")
            "G90" -> NcCodeDescriptor(code,"ABS","PROGRAM_MODE","Absolute coordinate programming")
            "G91" -> NcCodeDescriptor(code,"INC","PROGRAM_MODE","Incremental coordinate programming")
            "G92" -> NcCodeDescriptor(code,"TEMP-ORG","COORD_XFORM","Temporary coordinate/origin definition")
            "G92.1" -> NcCodeDescriptor(code,"WCS-PRESET","COORD_XFORM","Work coordinate preset/state change")
            "G93" -> NcCodeDescriptor(code,"INV-TIME","FEED_MODE","Inverse-time feed")
            "G94" -> NcCodeDescriptor(code,"F/MIN","FEED_MODE","Feed per minute")
            "G95" -> NcCodeDescriptor(code,"F/REV","FEED_MODE","Feed per revolution")
            "G96" -> NcCodeDescriptor(code,"CSS","SPINDLE_MODE","Constant surface speed")
            "G97" -> NcCodeDescriptor(code,"RPM","SPINDLE_MODE","Fixed spindle RPM mode")
            "G98" -> NcCodeDescriptor(code,"RET-INIT","CYCLE_RETURN","Return to initial plane")
            "G99" -> NcCodeDescriptor(code,"RET-R","CYCLE_RETURN","Return to R plane")
            "M0" -> NcCodeDescriptor(code,"STOP","PROGRAM_CONTROL","Program stop")
            "M1" -> NcCodeDescriptor(code,"OPT-STOP","PROGRAM_CONTROL","Optional stop")
            "M2" -> NcCodeDescriptor(code,"END","PROGRAM_CONTROL","Program end")
            "M3" -> NcCodeDescriptor(code,"SP-CW","SPINDLE","Spindle clockwise")
            "M4" -> NcCodeDescriptor(code,"SP-CCW","SPINDLE","Spindle counter-clockwise")
            "M5" -> NcCodeDescriptor(code,"SP-OFF","SPINDLE","Spindle stop")
            "M6" -> NcCodeDescriptor(code,"TOOL-CHG","TOOL_CHANGE","Tool change")
            "M7" -> NcCodeDescriptor(code,"MIST","COOLANT","Mist coolant")
            "M8" -> NcCodeDescriptor(code,"COOL-ON","COOLANT","Flood coolant on")
            "M9" -> NcCodeDescriptor(code,"COOL-OFF","COOLANT","Coolant off")
            "M19" -> NcCodeDescriptor(code,"SP-ORIENT","SPINDLE","Spindle orientation")
            "M30" -> NcCodeDescriptor(code,"END-RESET","PROGRAM_CONTROL","Program end and reset")
            "M98" -> NcCodeDescriptor(code,"SUB-CALL","SUBPROGRAM","Subprogram call")
            "M99" -> NcCodeDescriptor(code,"SUB-RET","SUBPROGRAM","Subprogram return")
            else -> NcCodeDescriptor(code,"UNKNOWN","UNKNOWN","Unclassified CNC code")
        }
    }

    fun programLegend(program: String, limit: Int = 18): String {
        val codes = (NcModalTracker.codes(program) + NcAuxiliaryTracker.codes(program))
            .sortedBy { it.first }
            .map { it.second }
            .distinct()
        val shown = codes.take(limit).joinToString(" | ") { describe(it).compact() }
        return if (codes.size <= limit) shown else shown + " | +" + (codes.size-limit)
    }

    fun layerOf(code: String): String = describe(code).layer

    fun codesInLine(line: String): List<String> =
        (NcModalTracker.codes(line) + NcAuxiliaryTracker.codes(line))
            .sortedBy { it.first }
            .map { it.second }
            .distinct()

    fun lineHelp(program: String, lineNumber: Int): String {
        val lines = program.split("\n")
        if (lineNumber !in 1..lines.size) return "LINE " + lineNumber + " • OUT OF RANGE"
        val raw = lines[lineNumber - 1]
        val codes = codesInLine(raw)
        val decoded = if (codes.isEmpty()) {
            "NO G/M CODE"
        } else {
            codes.joinToString(" • ") { code ->
                val d = describe(code)
                d.compact() + " [" + d.layer + "] " + d.meaning
            }
        }
        val blocked = NcProgramSafetyPolicy.blocking(program).filter { it.lineNumber == lineNumber }
        val safety = if (blocked.isEmpty()) {
            "SAFETY=PASS"
        } else {
            "BLOCKED=" + blocked.joinToString(",") { it.code }
        }
        return "L" + lineNumber + " • " + decoded + " • " + safety
    }

    fun lineNumberAt(program: String, caret: Int): Int {
        val p = caret.coerceIn(0, program.length)
        var line = 1
        for (i in 0 until p) if (program[i] == '\n') line++
        return line
    }
}

data class NcAnimationCue(
    val lineNumber: Int,
    val code: String,
    val action: String,
    val layer: String,
    val blocked: Boolean,
    val safetyCodes: List<String>
) {
    fun compact(): String = code + "=>" + if (blocked) "BLOCKED" else action
}

object NcAnimationBridge {
    fun actionFor(rawCode: String): String {
        val code = rawCode.uppercase()
        return when (code) {
            "G0" -> "RAPID_MOVE"
            "G1" -> "CUT_LINEAR"
            "G2" -> "CUT_ARC_CW"
            "G3" -> "CUT_ARC_CCW"
            "G34" -> "HOLE_PATTERN"
            "G73","G81","G82","G83","G84","G85","G86","G87","G88","G89" -> "CANNED_CYCLE"
            "G43.1","G43.4","G43.5","G43.7","G53.1","G53.6","G68.2","G68.3" -> "AXIS_5X_ORIENTATION"
            "M3" -> "SPINDLE_CW"
            "M4" -> "SPINDLE_CCW"
            "M5" -> "SPINDLE_STOP"
            "M6" -> "TOOL_CHANGE"
            "M7" -> "COOLANT_MIST"
            "M8" -> "COOLANT_FLOOD"
            "M9" -> "COOLANT_OFF"
            "M19" -> "SPINDLE_ORIENT"
            "M0","M1" -> "PROGRAM_PAUSE"
            "M2","M30" -> "PROGRAM_END"
            "M98" -> "SUBPROGRAM_CALL"
            "M99" -> "SUBPROGRAM_RETURN"
            else -> if (NcCodeCatalog.describe(code).layer == "UNKNOWN") "UNSUPPORTED" else "STATE_SYNC"
        }
    }

    fun cuesForLine(program: String, lineNumber: Int): List<NcAnimationCue> {
        val lines = program.split("\n")
        if (lineNumber !in 1..lines.size) return emptyList()
        val safety = NcProgramSafetyPolicy.blocking(program)
            .filter { it.lineNumber == lineNumber }
            .map { it.code }
            .distinct()
        return NcCodeCatalog.codesInLine(lines[lineNumber - 1]).map { code ->
            val d = NcCodeCatalog.describe(code)
            NcAnimationCue(lineNumber, code, actionFor(code), d.layer, safety.isNotEmpty(), safety)
        }
    }

    fun lineEvidence(program: String, lineNumber: Int): String {
        val cues = cuesForLine(program, lineNumber)
        if (cues.isEmpty()) return "ANIM L" + lineNumber + " • NO G/M EVENT"
        val blocked = cues.flatMap { it.safetyCodes }.distinct()
        if (blocked.isNotEmpty()) {
            return "ANIM L" + lineNumber + " • BLOCKED=" + blocked.joinToString(",")
        }
        return "ANIM L" + lineNumber + " • " + cues.joinToString(" | ") { it.compact() }
    }

    fun programSummary(program: String, limit: Int = 12): String {
        val blocked = NcProgramSafetyPolicy.blocking(program)
        if (blocked.isNotEmpty()) {
            return "NC→3D ANIM BLOCKED • " + blocked.take(4).joinToString(",") {
                (if (it.lineNumber > 0) "L" + it.lineNumber + ":" else "") + it.code
            }
        }
        val cues = program.split("\n").indices
            .flatMap { index -> cuesForLine(program, index + 1) }
            .filter { it.action != "STATE_SYNC" }
            .distinctBy { it.code + "|" + it.action }
        if (cues.isEmpty()) return "NC→3D ANIM READY • STATE_SYNC_ONLY"
        val shown = cues.take(limit).joinToString(" | ") { it.compact() }
        return "NC→3D ANIM READY • " + shown + if (cues.size > limit) " | +" + (cues.size - limit) else ""
    }
}

data class NcSemanticAuthorityResult(
    val lineNumber: Int,
    val codes: List<String>,
    val safetyCodes: List<String>,
    val conflictCodes: List<String>,
    val animationEvidence: String
) {
    val blocked: Boolean get() = safetyCodes.isNotEmpty() || conflictCodes.isNotEmpty()
    fun evidence(): String {
        val status = if (conflictCodes.isNotEmpty()) "CONFLICT_BLOCKED"
            else if (safetyCodes.isNotEmpty()) "SAFETY_BLOCKED"
            else "CONSENSUS_PASS"
        val codeText = if (codes.isEmpty()) "NONE" else codes.joinToString(",")
        val detail = when {
            conflictCodes.isNotEmpty() -> " • CONFLICT=" + conflictCodes.joinToString(",")
            safetyCodes.isNotEmpty() -> " • SAFETY=" + safetyCodes.joinToString(",")
            else -> ""
        }
        return "AUTH=" + status + " • CODES=" + codeText + detail + " • " + animationEvidence
    }
}

object NcSemanticAuthority {
    fun consistencyIssues(
        code: String,
        safetyCodes: List<String>,
        capabilityStatus: ControllerCapabilityStatus,
        animationAction: String
    ): List<String> {
        val descriptor = NcCodeCatalog.describe(code)
        val issues = mutableListOf<String>()
        val unknown = descriptor.layer == "UNKNOWN"
        val unknownSafety = safetyCodes.any { it.startsWith("UNKNOWN_") }

        if (unknown && capabilityStatus != ControllerCapabilityStatus.UNKNOWN_FAIL_CLOSED) {
            issues += "UNKNOWN_CAPABILITY_MISMATCH:" + code
        }
        if (unknown && !unknownSafety) {
            issues += "UNKNOWN_NOT_FAIL_CLOSED:" + code
        }
        if (!unknown && animationAction == "UNSUPPORTED") {
            issues += "KNOWN_CODE_ANIMATION_UNSUPPORTED:" + code
        }
        if (capabilityStatus == ControllerCapabilityStatus.UNKNOWN_FAIL_CLOSED && !unknownSafety) {
            issues += "CAPABILITY_UNKNOWN_NOT_BLOCKED:" + code
        }
        if (animationAction == "UNSUPPORTED" && !unknownSafety) {
            issues += "ANIMATION_UNSUPPORTED_NOT_BLOCKED:" + code
        }
        return issues.distinct()
    }

    private fun animationEvidence(
        lineNumber: Int,
        codes: List<String>,
        safetyCodes: List<String>
    ): String {
        if (codes.isEmpty()) return "ANIM L" + lineNumber + " • NO G/M EVENT"
        if (safetyCodes.isNotEmpty()) {
            return "ANIM L" + lineNumber + " • BLOCKED=" + safetyCodes.joinToString(",")
        }
        return "ANIM L" + lineNumber + " • " + codes.joinToString(" | ") { code ->
            code + "=>" + NcAnimationBridge.actionFor(code)
        }
    }

    private fun resolvePrepared(
        lines: List<String>,
        lineNumber: Int,
        controller: CncControllerProfile,
        safetyByLine: Map<Int,List<String>>
    ): NcSemanticAuthorityResult {
        if (lineNumber !in 1..lines.size) {
            return NcSemanticAuthorityResult(
                lineNumber,
                emptyList(),
                emptyList(),
                listOf("LINE_OUT_OF_RANGE"),
                "ANIM L" + lineNumber + " • OUT OF RANGE"
            )
        }

        val codes = NcCodeCatalog.codesInLine(lines[lineNumber - 1])
        val safetyCodes = safetyByLine[lineNumber].orEmpty().distinct()
        val conflicts = codes.flatMap { code ->
            consistencyIssues(
                code,
                safetyCodes,
                CncControllerCapabilityMatrix.classify(controller, code).status,
                NcAnimationBridge.actionFor(code)
            )
        }.distinct()

        return NcSemanticAuthorityResult(
            lineNumber,
            codes,
            safetyCodes,
            conflicts,
            animationEvidence(lineNumber, codes, safetyCodes)
        )
    }

    fun resolveLine(
        program: String,
        lineNumber: Int,
        controller: CncControllerProfile
    ): NcSemanticAuthorityResult {
        val lines = program.split("\n")
        val safetyByLine = NcProgramSafetyPolicy.blocking(program)
            .groupBy { it.lineNumber }
            .mapValues { (_, findings) -> findings.map { it.code }.distinct() }
        return resolvePrepared(lines, lineNumber, controller, safetyByLine)
    }

    fun resolveProgram(
        program: String,
        controller: CncControllerProfile
    ): List<NcSemanticAuthorityResult> {
        val lines = program.split("\n")
        val safetyByLine = NcProgramSafetyPolicy.blocking(program)
            .groupBy { it.lineNumber }
            .mapValues { (_, findings) -> findings.map { it.code }.distinct() }
        return lines.indices.map { index ->
            resolvePrepared(lines, index + 1, controller, safetyByLine)
        }
    }

    fun lineEvidence(
        program: String,
        lineNumber: Int,
        controller: CncControllerProfile
    ): String = resolveLine(program, lineNumber, controller).evidence()

    fun programSummary(
        program: String,
        controller: CncControllerProfile
    ): String {
        val results = resolveProgram(program, controller)
        val conflicts = results.flatMap { it.conflictCodes }.distinct()
        if (conflicts.isNotEmpty()) {
            return "NC SEMANTIC AUTHORITY • CONFLICT BLOCKED • " + conflicts.take(6).joinToString(",")
        }
        val safety = results.flatMap { result ->
            result.safetyCodes.map { code -> "L" + result.lineNumber + ":" + code }
        }.distinct()
        if (safety.isNotEmpty()) {
            return "NC SEMANTIC AUTHORITY • SAFETY BLOCKED • " + safety.take(6).joinToString(",")
        }
        val activeCodes = results.flatMap { it.codes }.distinct()
        val animations = activeCodes.map { code -> code + "=>" + NcAnimationBridge.actionFor(code) }
            .filterNot { it.endsWith("=>STATE_SYNC") }
        return "NC SEMANTIC AUTHORITY • CONSENSUS PASS • " +
            if (animations.isEmpty()) "STATE_SYNC_ONLY" else animations.take(12).joinToString(" | ")
    }
}


enum class NcExecutionDomain {
    NC_CURSOR,
    MOTION_3D,
    MATERIAL_REMOVAL,
    AXIS_5X,
    SPINDLE,
    COOLANT,
    TOOL_CHANGE,
    PROGRAM_CONTROL
}

data class NcExecutionEvent(
    val sequence: Int,
    val lineNumber: Int,
    val code: String,
    val action: String,
    val domains: Set<NcExecutionDomain>,
    val status: String,
    val reasons: List<String>
) {
    val executable: Boolean get() = status == "READY"
    fun compact(): String =
        "#" + sequence + " L" + lineNumber + " " + code + "=>" + action +
            " [" + domains.joinToString("+") { it.name } + "] " + status +
            if (reasons.isEmpty()) "" else "{" + reasons.joinToString(",") + "}"
}


data class NcAxisTravelRange(val min: Double, val max: Double) {
    init {
        require(min.isFinite() && max.isFinite() && min < max)
    }
    fun contains(value: Double): Boolean = value.isFinite() && value >= min && value <= max
    fun compact(): String = "[" + min + "," + max + "]"
}

data class NcMachineTravelLimits(
    val x: NcAxisTravelRange? = null,
    val y: NcAxisTravelRange? = null,
    val z: NcAxisTravelRange? = null,
    val a: NcAxisTravelRange? = NcAxisTravelRange(-360.0, 360.0),
    val b: NcAxisTravelRange? = NcAxisTravelRange(-360.0, 360.0)
) {
    fun rangeFor(axis: Char): NcAxisTravelRange? = when (axis.uppercaseChar()) {
        'X' -> x
        'Y' -> y
        'Z' -> z
        'A' -> a
        'B' -> b
        else -> null
    }

    companion object {
        fun verified(
            xMin: Double, xMax: Double,
            yMin: Double, yMax: Double,
            zMin: Double, zMax: Double,
            aMin: Double = -360.0, aMax: Double = 360.0,
            bMin: Double = -360.0, bMax: Double = 360.0
        ): NcMachineTravelLimits = NcMachineTravelLimits(
            x = NcAxisTravelRange(xMin, xMax),
            y = NcAxisTravelRange(yMin, yMax),
            z = NcAxisTravelRange(zMin, zMax),
            a = NcAxisTravelRange(aMin, aMax),
            b = NcAxisTravelRange(bMin, bMax)
        )
    }
}

data class NcRuntimeInterlockFinding(
    val lineNumber: Int,
    val code: String,
    val message: String
)

object NcRuntimeInterlock {
    private val numericWord = Regex("""(?i)([A-Z])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?=\s|[A-Z]|$)""")
    private val recognizedAddresses = setOf(
        'G','M','N','O','X','Y','Z','A','B','I','J','K','R','Q','F','S','T','H','P','D'
    )
    private val axisAddresses = setOf('X','Y','Z','A','B')

    private fun cleanLine(raw: String): String =
        raw.replace(Regex("""\([^)]*\)"""), " ")
            .substringBefore(';')
            .trim()
            .uppercase()

    fun findings(
        program: String,
        limits: NcMachineTravelLimits = NcMachineTravelLimits()
    ): List<NcRuntimeInterlockFinding> {
        val findings = mutableListOf<NcRuntimeInterlockFinding>()
        val current = mutableMapOf('X' to 0.0, 'Y' to 0.0, 'Z' to 0.0, 'A' to 0.0, 'B' to 0.0)
        var absolute = true

        program.split("\n").forEachIndexed { index, raw ->
            val lineNumber = index + 1
            val line = cleanLine(raw)
            if (line.isBlank() || line == "%") return@forEachIndexed

            if ('#' in line || '[' in line || ']' in line) {
                findings += NcRuntimeInterlockFinding(
                    lineNumber,
                    "UNRESOLVED_NUMERIC_EXPRESSION",
                    "Macro/expression numeric input is not resolved by the deterministic runtime interlock."
                )
            }

            val matches = numericWord.findAll(line).toList()
            val covered = BooleanArray(line.length)
            matches.forEach { m ->
                for (i in m.range) if (i in covered.indices) covered[i] = true
            }

            line.forEachIndexed { charIndex, ch ->
                if (ch.isLetter() && !covered[charIndex]) {
                    val address = ch.uppercaseChar()
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        if (address in recognizedAddresses) "MALFORMED_NUMERIC_WORD_" + address
                        else "UNSUPPORTED_NC_ADDRESS_" + address,
                        if (address in recognizedAddresses)
                            "Address " + address + " requires a finite numeric value."
                        else "Address " + address + " is not supported by the current AIG NC execution model."
                    )
                }
            }

            val words = matches.mapNotNull { m ->
                val address = m.groupValues[1].uppercase()[0]
                val value = m.groupValues[2].toDoubleOrNull()
                if (address !in recognizedAddresses) {
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        "UNSUPPORTED_NC_ADDRESS_" + address,
                        "Address " + address + " is not supported by the current AIG NC execution model."
                    )
                    null
                } else if (value == null || !value.isFinite()) {
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        "NON_FINITE_NUMERIC_WORD_" + address,
                        "Address " + address + " must contain a finite numeric value."
                    )
                    null
                } else address to value
            }

            words.filter { it.first in axisAddresses }
                .groupingBy { it.first }
                .eachCount()
                .filterValues { it > 1 }
                .forEach { (axis, count) ->
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        "DUPLICATE_AXIS_WORD_" + axis,
                        "Axis " + axis + " appears " + count + " times in one block; execution is fail-closed."
                    )
                }

            val singletonAddresses = setOf('I','J','K','R','Q','F','S','T','H','P','D')
            words.filter { it.first in singletonAddresses }
                .groupingBy { it.first }
                .eachCount()
                .filterValues { it > 1 }
                .forEach { (address, count) ->
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        "DUPLICATE_ADDRESS_" + address,
                        "Address " + address + " appears " + count + " times in one block; execution is fail-closed."
                    )
                }

            val gValues = words.filter { it.first == 'G' }.map { it.second }
            fun hasG(value: Double): Boolean = gValues.any { kotlin.math.abs(it - value) <= 1e-9 }
            fun conflict(group: String, values: List<Double>) {
                val active = values.filter { hasG(it) }
                if (active.size > 1) {
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        "CONFLICTING_MODAL_GROUP_" + group,
                        "Conflicting modal G codes in group " + group + ": " +
                            active.joinToString(",") { "G" + it.toString().removeSuffix(".0") }
                    )
                }
            }
            conflict("PROGRAM_MODE", listOf(90.0,91.0))
            conflict("UNITS", listOf(20.0,21.0))
            conflict("FEED_MODE", listOf(93.0,94.0,95.0))
            conflict("PLANE", listOf(17.0,18.0,19.0))
            conflict("CUTTER_COMP", listOf(40.0,41.0,42.0))
            conflict("TOOL_LENGTH", listOf(43.0,49.0))
            conflict("WORK_OFFSET", listOf(54.0,55.0,56.0,57.0,58.0,59.0))
            conflict("FIXED_CYCLE", listOf(80.0,81.0,82.0,83.0,84.0,85.0,86.0,87.0,88.0,89.0))
            conflict("CYCLE_RETURN", listOf(98.0,99.0))
            conflict("PATH_CONTROL", listOf(61.0,64.0))
            conflict("SPINDLE_SPEED_MODE", listOf(96.0,97.0))

            words.filter { it.first == 'G' }.forEach { (_, value) ->
                when {
                    kotlin.math.abs(value - 90.0) <= 1e-9 -> absolute = true
                    kotlin.math.abs(value - 91.0) <= 1e-9 -> absolute = false
                }
            }

            words.filter { it.first in axisAddresses }.forEach { (axis, programmed) ->
                val previous = current.getValue(axis)
                val target = if (absolute) programmed else previous + programmed
                if (!target.isFinite()) {
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        "AXIS_" + axis + "_NON_FINITE_TARGET",
                        "Axis " + axis + " target is non-finite."
                    )
                    return@forEach
                }

                val range = limits.rangeFor(axis)
                if (range != null && !range.contains(target)) {
                    findings += NcRuntimeInterlockFinding(
                        lineNumber,
                        "AXIS_" + axis + "_TRAVEL_LIMIT_EXCEEDED",
                        "Axis " + axis + " target " + target + " exceeds configured travel " + range.compact() + "."
                    )
                }
                current[axis] = target
            }
        }

        return findings.distinctBy { Triple(it.lineNumber, it.code, it.message) }
    }

    fun status(
        program: String,
        limits: NcMachineTravelLimits = NcMachineTravelLimits()
    ): String {
        val blocked = findings(program, limits)
        return if (blocked.isEmpty()) "PASS"
        else "INTERLOCK_BLOCKED:" + blocked.joinToString(",") {
            "L" + it.lineNumber + ":" + it.code
        }
    }
}


enum class NcMachineInterlockState {
    READY,
    ALARM_LATCHED,
    RESET_REQUIRED,
    REVALIDATE_REQUIRED,
    RESUME_ALLOWED
}

data class NcMachineInterlockSnapshot(
    val state: NcMachineInterlockState,
    val alarmLine: Int?,
    val alarmCodes: List<String>,
    val message: String
) {
    val canExecute: Boolean get() = state == NcMachineInterlockState.READY
    val feedHold: Boolean get() = !canExecute
    fun evidence(): String =
        "MACHINE • " + state.name +
            " • FEED_HOLD=" + (if (feedHold) "ON" else "OFF") +
            (if (alarmCodes.isEmpty()) "" else
                " • ALARM=" + (alarmLine?.let { "L" + it + ":" } ?: "") + alarmCodes.joinToString(","))
}

class NcMachineInterlockSession(
    private val limits: NcMachineTravelLimits = NcMachineTravelLimits()
) {
    private var state: NcMachineInterlockState = NcMachineInterlockState.READY
    private var latchedFindings: List<NcRuntimeInterlockFinding> = emptyList()

    private fun snapshot(message: String): NcMachineInterlockSnapshot {
        val first = latchedFindings.firstOrNull()
        return NcMachineInterlockSnapshot(
            state = state,
            alarmLine = first?.lineNumber,
            alarmCodes = latchedFindings.map { it.code }.distinct(),
            message = message
        )
    }

    fun inspect(program: String): NcMachineInterlockSnapshot {
        val findings = NcRuntimeInterlock.findings(program, limits)
        if (findings.isNotEmpty()) {
            latchedFindings = findings
            state = NcMachineInterlockState.ALARM_LATCHED
            return snapshot("Runtime interlock alarm latched; execution/feed is held.")
        }

        if (state == NcMachineInterlockState.ALARM_LATCHED) {
            state = NcMachineInterlockState.RESET_REQUIRED
            return snapshot("Input is corrected, but the latched alarm requires RESET before revalidation.")
        }
        return snapshot(
            when (state) {
                NcMachineInterlockState.READY -> "Program is validated and execution is permitted."
                NcMachineInterlockState.RESET_REQUIRED -> "Corrected input detected; RESET is required."
                NcMachineInterlockState.REVALIDATE_REQUIRED -> "RESET accepted; revalidation is required."
                NcMachineInterlockState.RESUME_ALLOWED -> "Revalidation passed; RESUME is allowed."
                NcMachineInterlockState.ALARM_LATCHED -> "Alarm remains latched."
            }
        )
    }

    fun reset(): NcMachineInterlockSnapshot {
        if (state == NcMachineInterlockState.ALARM_LATCHED ||
            state == NcMachineInterlockState.RESET_REQUIRED) {
            state = NcMachineInterlockState.REVALIDATE_REQUIRED
        }
        return snapshot(
            if (state == NcMachineInterlockState.REVALIDATE_REQUIRED)
                "RESET accepted; run revalidation before RESUME."
            else
                "RESET ignored because no resettable alarm state is active."
        )
    }

    fun revalidate(program: String): NcMachineInterlockSnapshot {
        val findings = NcRuntimeInterlock.findings(program, limits)
        if (findings.isNotEmpty()) {
            latchedFindings = findings
            state = NcMachineInterlockState.ALARM_LATCHED
            return snapshot("Revalidation failed; alarm latched and execution remains held.")
        }

        state = when (state) {
            NcMachineInterlockState.REVALIDATE_REQUIRED -> NcMachineInterlockState.RESUME_ALLOWED
            NcMachineInterlockState.READY -> NcMachineInterlockState.READY
            NcMachineInterlockState.RESUME_ALLOWED -> NcMachineInterlockState.RESUME_ALLOWED
            NcMachineInterlockState.ALARM_LATCHED,
            NcMachineInterlockState.RESET_REQUIRED -> NcMachineInterlockState.RESET_REQUIRED
        }
        if (state == NcMachineInterlockState.RESUME_ALLOWED ||
            state == NcMachineInterlockState.READY) {
            latchedFindings = emptyList()
        }
        return snapshot(
            when (state) {
                NcMachineInterlockState.RESUME_ALLOWED -> "Revalidation passed; RESUME is now allowed."
                NcMachineInterlockState.READY -> "Program remains READY."
                else -> "Revalidation is clean, but RESET is still required before RESUME."
            }
        )
    }

    fun resume(): NcMachineInterlockSnapshot {
        if (state == NcMachineInterlockState.RESUME_ALLOWED) {
            state = NcMachineInterlockState.READY
            latchedFindings = emptyList()
            return snapshot("RESUME accepted; execution returned to READY.")
        }
        return snapshot("RESUME blocked until RESET and revalidation pass.")
    }

    fun current(): NcMachineInterlockSnapshot = snapshot("Current interlock state.")
}


object NcExecutionTimeline {
    private fun domainsFor(action: String): Set<NcExecutionDomain> = when (action) {
        "RAPID_MOVE" -> setOf(NcExecutionDomain.NC_CURSOR, NcExecutionDomain.MOTION_3D)
        "CUT_LINEAR","CUT_ARC_CW","CUT_ARC_CCW","HOLE_PATTERN","CANNED_CYCLE" ->
            setOf(NcExecutionDomain.NC_CURSOR, NcExecutionDomain.MOTION_3D, NcExecutionDomain.MATERIAL_REMOVAL)
        "AXIS_5X_ORIENTATION" ->
            setOf(NcExecutionDomain.NC_CURSOR, NcExecutionDomain.MOTION_3D, NcExecutionDomain.AXIS_5X)
        "SPINDLE_CW","SPINDLE_CCW","SPINDLE_STOP","SPINDLE_ORIENT" ->
            setOf(NcExecutionDomain.NC_CURSOR, NcExecutionDomain.SPINDLE)
        "COOLANT_MIST","COOLANT_FLOOD","COOLANT_OFF" ->
            setOf(NcExecutionDomain.NC_CURSOR, NcExecutionDomain.COOLANT)
        "TOOL_CHANGE" ->
            setOf(NcExecutionDomain.NC_CURSOR, NcExecutionDomain.TOOL_CHANGE)
        "PROGRAM_PAUSE","PROGRAM_END","SUBPROGRAM_CALL","SUBPROGRAM_RETURN" ->
            setOf(NcExecutionDomain.NC_CURSOR, NcExecutionDomain.PROGRAM_CONTROL)
        "INTERLOCK_HALT" -> setOf(
            NcExecutionDomain.NC_CURSOR,
            NcExecutionDomain.MOTION_3D,
            NcExecutionDomain.MATERIAL_REMOVAL,
            NcExecutionDomain.AXIS_5X,
            NcExecutionDomain.SPINDLE,
            NcExecutionDomain.COOLANT,
            NcExecutionDomain.TOOL_CHANGE,
            NcExecutionDomain.PROGRAM_CONTROL
        )
        else -> setOf(NcExecutionDomain.NC_CURSOR)
    }

    fun build(
        program: String,
        controller: CncControllerProfile,
        machineLimits: NcMachineTravelLimits = NcMachineTravelLimits()
    ): List<NcExecutionEvent> {
        val lines = program.split("\n")
        val out = mutableListOf<NcExecutionEvent>()
        val runtimeInterlocks = NcRuntimeInterlock.findings(program, machineLimits).groupBy { it.lineNumber }
        val authorityByLine = NcSemanticAuthority.resolveProgram(program, controller).associateBy { it.lineNumber }
        var halted = false
        var sequence = 1

        lines.indices.forEach { index ->
            val lineNumber = index + 1
            val authority = authorityByLine.getValue(lineNumber)
            val codes = authority.codes
            val runtimeReasons = runtimeInterlocks[lineNumber].orEmpty().map { it.code }.distinct()
            val effectiveCodes = if (codes.isEmpty() && runtimeReasons.isNotEmpty()) listOf("INPUT") else codes
            if (effectiveCodes.isEmpty()) return@forEach

            val reasons = (authority.conflictCodes + authority.safetyCodes + runtimeReasons).distinct()
            val blockedHere = reasons.isNotEmpty()

            effectiveCodes.forEach { code ->
                val action = if (code == "INPUT") "INTERLOCK_HALT" else NcAnimationBridge.actionFor(code)
                val status = when {
                    halted -> "SKIPPED_AFTER_BLOCK"
                    blockedHere -> "BLOCKED"
                    else -> "READY"
                }
                out += NcExecutionEvent(
                    sequence = sequence++,
                    lineNumber = lineNumber,
                    code = code,
                    action = action,
                    domains = domainsFor(action),
                    status = status,
                    reasons = if (status == "READY") emptyList() else
                        if (halted && !blockedHere) listOf("PREVIOUS_BLOCK") else reasons
                )
            }

            if (blockedHere) halted = true
        }
        return out
    }

    fun lineEvents(
        program: String,
        lineNumber: Int,
        controller: CncControllerProfile,
        machineLimits: NcMachineTravelLimits = NcMachineTravelLimits()
    ): List<NcExecutionEvent> = build(program, controller, machineLimits).filter { it.lineNumber == lineNumber }

    fun lineEvidence(
        program: String,
        lineNumber: Int,
        controller: CncControllerProfile,
        machineLimits: NcMachineTravelLimits = NcMachineTravelLimits()
    ): String {
        val events = lineEvents(program, lineNumber, controller, machineLimits)
        if (events.isEmpty()) return "TIMELINE L" + lineNumber + " • NO EVENT"
        return "TIMELINE L" + lineNumber + " • " + events.joinToString(" | ") { it.compact() }
    }

    fun programSummary(
        program: String,
        controller: CncControllerProfile,
        machineLimits: NcMachineTravelLimits = NcMachineTravelLimits()
    ): String {
        val events = build(program, controller, machineLimits)
        val blocked = events.firstOrNull { it.status == "BLOCKED" }
        if (blocked != null) {
            val skipped = events.count { it.status == "SKIPPED_AFTER_BLOCK" }
            return "NC EXECUTION TIMELINE • HALTED AT L" + blocked.lineNumber +
                " • " + blocked.reasons.joinToString(",") +
                " • downstream_skipped=" + skipped
        }
        val executable = events.count { it.executable }
        val domains = events.flatMap { it.domains }.distinct()
        return "NC EXECUTION TIMELINE • READY • events=" + executable +
            " • domains=" + domains.joinToString(",") { it.name }
    }
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
        "|G92=" + (if (temporaryOriginActive) "ACTIVE" else "OFF") +
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
            val line = raw.replace(Regex("""\([^)]*\)"""), " ").substringBefore(';')
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
            val line = raw.replace(Regex("""\([^)]*\)"""), " ").substringBefore(';')
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


data class NcAuxiliaryState(
    val spindle: String = "M5",
    val coolant: String = "M9",
    val spindleOrientation: String = "OFF",
    val programControl: String = "RUN"
) {
    fun evidence(): String =
        "SPINDLE=" + spindle +
        "|COOLANT=" + coolant +
        "|ORIENT=" + spindleOrientation +
        "|PROGRAM=" + programControl
}

data class NcAuxiliaryEvent(
    val lineNumber: Int,
    val code: String,
    val group: String,
    val stateAfter: NcAuxiliaryState
)

object NcAuxiliaryTracker {
    private val mCode = Regex("""(?i)(?<![A-Z0-9.])M\s*(\d{1,3})(?![0-9.])""")

    fun codes(program: String): List<Pair<Int,String>> {
        val out = mutableListOf<Pair<Int,String>>()
        program.lineSequence().forEachIndexed { index, raw ->
            val line = raw.replace(Regex("""\([^)]*\)"""), " ").substringBefore(';')
            mCode.findAll(line).forEach { match ->
                out += (index + 1) to ("M" + match.groupValues[1].toInt())
            }
        }
        return out
    }

    fun trace(program: String): List<NcAuxiliaryEvent> {
        var state = NcAuxiliaryState()
        val events = mutableListOf<NcAuxiliaryEvent>()
        codes(program).forEach { (line, code) ->
            val group: String?
            state = when (code) {
                "M3","M4","M5" -> { group = "SPINDLE"; state.copy(spindle = code) }
                "M7","M8","M9" -> { group = "COOLANT"; state.copy(coolant = code) }
                "M19" -> { group = "SPINDLE_ORIENT"; state.copy(spindleOrientation = "M19") }
                "M0" -> { group = "PROGRAM_STOP"; state.copy(programControl = "M0") }
                "M1" -> { group = "OPTIONAL_STOP"; state.copy(programControl = "M1") }
                "M2","M30" -> { group = "PROGRAM_END"; state.copy(programControl = code) }
                "M6" -> { group = "TOOL_CHANGE"; state }
                "M98" -> { group = "SUBPROGRAM_CALL"; state }
                "M99" -> { group = "SUBPROGRAM_RETURN"; state }
                else -> { group = null; state }
            }
            if (group != null) events += NcAuxiliaryEvent(line,code,group,state)
        }
        return events
    }

    fun finalState(program: String): NcAuxiliaryState =
        trace(program).lastOrNull()?.stateAfter ?: NcAuxiliaryState()

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


object NcAuxiliarySafetyPolicy {
    private val known = setOf(
        "M0","M1","M2","M3","M4","M5","M6","M7","M8","M9","M19","M30","M98","M99"
    )

    fun blocking(program: String): List<NcModalSafetyFinding> {
        val findings = mutableListOf<NcModalSafetyFinding>()
        NcAuxiliaryTracker.trace(program).forEach { e ->
            when (e.code) {
                "M4" -> findings += NcModalSafetyFinding(
                    e.lineNumber,"M4_REVERSE_SPINDLE_UNVERIFIED",
                    "Reverse-spindle execution is tracked but the current AIG CAM/SIM spindle model is forward/fixed-RPM only."
                )
                "M7" -> findings += NcModalSafetyFinding(
                    e.lineNumber,"M7_MIST_COOLANT_UNVERIFIED",
                    "Mist coolant is tracked but not part of the current verified AIG coolant contract."
                )
                "M19" -> findings += NcModalSafetyFinding(
                    e.lineNumber,"M19_SPINDLE_ORIENT_UNVERIFIED",
                    "Spindle orientation is controller-managed and not yet represented by canonical CAM/SIM execution."
                )
            }
        }
        NcAuxiliaryTracker.codes(program).forEach { (line, code) ->
            if (code !in known) {
                findings += NcModalSafetyFinding(
                    line,"UNKNOWN_MCODE_FAIL_CLOSED",
                    code + " is not in the current AIG verified/tracked M-code vocabulary."
                )
            }
        }
        return findings.distinctBy { Triple(it.lineNumber,it.code,it.message) }
    }
}

object NcProgramSafetyPolicy {
    fun blocking(program: String): List<NcModalSafetyFinding> =
        (NcModalSafetyPolicy.blocking(program) + NcAuxiliarySafetyPolicy.blocking(program))
            .distinctBy { Triple(it.lineNumber,it.code,it.message) }

    fun status(program: String): String {
        val blocked = blocking(program)
        return if (blocked.isEmpty()) "PASS"
        else "BLOCKED:" + blocked.joinToString(",") {
            (if (it.lineNumber > 0) "L" + it.lineNumber + ":" else "") + it.code
        }
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
