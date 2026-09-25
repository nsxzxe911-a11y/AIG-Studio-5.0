package com.aigstudio.core

import kotlin.math.abs

private fun assertNear(actual: Double, expected: Double, eps: Double = 1e-6, msg: String = "") {
    check(abs(actual - expected) <= eps) { "$msg expected=$expected actual=$actual" }
}
private fun testSoftwareAbsoluteCoordinateContract() {
    val type = Class.forName("com.aigstudio.core.SoftwareCoordinateContract")
    val instance = type.getField("INSTANCE").get(null)
    val origin = type.getMethod("originDisplay").invoke(instance) as String
    val resolution = type.getMethod("displayResolutionMm").invoke(instance) as Double
    val offsetAffectsGeometry = type.getMethod("machineOffsetAffectsGeometry").invoke(instance) as Boolean
    check(origin == "0.000")
    check(resolution == 0.001)
    check(!offsetAffectsGeometry)
    check(SoftwareCoordinateContract.coordinateMode() == "G90")
    check(SoftwareCoordinateContract.masterOriginX() == 0.0)
    check(SoftwareCoordinateContract.masterOriginY() == 0.0)
    check(SoftwareCoordinateContract.masterOriginZ() == 0.0)
    check(SoftwareCoordinateContract.masterOriginData() == "X0.000 Y0.000 Z0.000")
    check(SoftwareCoordinateContract.preserveSignedCoordinates())
    check(!SoftwareCoordinateContract.simulationAppliesWorkOffset())
    check(!SoftwareCoordinateContract.simulationUsesToleranceCompensation())
    check(SoftwareCoordinateContract.xyzData(-50.0, -40.0, -3.0) == "X-50.000 Y-40.000 Z-3.000")
    check(SoftwareCoordinateContract.xyzData(50.0, 40.0, 5.0) == "X50.000 Y40.000 Z5.000")
    check(DisplayFormat.mm(-50.0) == "-50.000")
    check(DisplayFormat.mm(0.0) == "0.000")
    check(SoftwareCoordinateContract.canonicalCoordinateTruth() ==
        "CAD/CAM/SIM ABS G90 • MASTER X0.000 Y0.000 Z0.000")
    check(SoftwareCoordinateContract.coordinateResponsibilityLayers() == listOf(
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
    ))
    check(SoftwareCoordinateContract.coordinateUsageGuidance() == listOf(
        "GENERAL_MACHINING=G90",
        "REPEATED_POCKET_PATTERN=G91",
        "SUBPROGRAM_MACRO=G91",
        "ANGULAR_FEATURE_TEMP_ORIGIN=G92",
        "MULTI_FIXTURE_TEMP_ORIGIN=G92",
        "COPY_PASTE_PROGRAM_BLOCK=G90"
    ))
    println("✓ ABSOLUTE_COORDINATE_DATA_GATE_PASS G90 MASTER=X0.000/Y0.000/Z0.000 SIGNED=TRUE SIM_OFFSET_SHIFT=OFF SIM_TOLERANCE_SHIFT=OFF")
    println("✓ COORDINATE_RESPONSIBILITY_GATE_PASS expanded modal/transform provenance")
    println("✓ COORDINATE_USAGE_GUIDE_PASS G90/G91/G92 use cases locked")

    val capabilityProgram = "G21 G94 G97 G90 G54 G34 G43.4 G54.4 G777.7"
    check(CncControllerCapabilityMatrix.classify(
        CncControllerProfile.FANUC,"G90"
    ).status == ControllerCapabilityStatus.MODELED_ALLOWED)
    check(CncControllerCapabilityMatrix.classify(
        CncControllerProfile.MITSUBISHI_M800_M80,"G34"
    ).status == ControllerCapabilityStatus.MODELED_ALLOWED)
    check(CncControllerCapabilityMatrix.classify(
        CncControllerProfile.FANUC,"G43.4"
    ).status == ControllerCapabilityStatus.TRACKED_REVIEW)
    check(CncControllerCapabilityMatrix.classify(
        CncControllerProfile.MITSUBISHI_M800_M80,"G54.4"
    ).status == ControllerCapabilityStatus.TRACKED_REVIEW)
    check(CncControllerCapabilityMatrix.classify(
        CncControllerProfile.FANUC,"G777.7"
    ).status == ControllerCapabilityStatus.UNKNOWN_FAIL_CLOSED)
    val fanucCapability = CncControllerCapabilityMatrix.summary(CncControllerProfile.FANUC,capabilityProgram)
    val mitsubishiCapability = CncControllerCapabilityMatrix.summary(CncControllerProfile.MITSUBISHI_M800_M80,capabilityProgram)
    check("CTRL=FANUC" in fanucCapability)
    check("MODELED=6" in fanucCapability)
    check("TRACKED_REVIEW=2" in fanucCapability)
    check("UNKNOWN_BLOCK=1" in fanucCapability)
    check("CTRL=MITSUBISHI M800/M80" in mitsubishiCapability)
    println("✓ CONTROLLER_CAPABILITY_MATRIX_PASS FANUC/MITSUBISHI modeled/review/unknown")

    check(NcCodeCatalog.describe("G90").compact()=="G90=ABS")
    check(NcCodeCatalog.describe("G91").compact()=="G91=INC")
    check(NcCodeCatalog.describe("G92").compact()=="G92=TEMP-ORG")
    check(NcCodeCatalog.describe("G41").compact()=="G41=L-COMP")
    check(NcCodeCatalog.describe("G42").compact()=="G42=R-COMP")
    check(NcCodeCatalog.describe("G43").compact()=="G43=TLEN")
    check(NcCodeCatalog.describe("G43.4").compact()=="G43.4=TCP")
    check(NcCodeCatalog.describe("G54").compact()=="G54=WCS")
    check(NcCodeCatalog.describe("G54.4").compact()=="G54.4=INSTALL-COMP")
    check(NcCodeCatalog.describe("M3").compact()=="M3=SP-CW")
    check(NcCodeCatalog.describe("M8").compact()=="M8=COOL-ON")
    check(NcCodeCatalog.describe("M98").compact()=="M98=SUB-CALL")
    check(NcCodeCatalog.describe("M99").compact()=="M99=SUB-RET")
    check(NcCodeCatalog.describe("G777.7").shortName=="UNKNOWN")
    val codeLegend = NcCodeCatalog.programLegend(
        "G21 G94 G97 G90 G54 G43\nM3 M8\nG41 G42\nM98 P4\nM99",
        20
    )
    check("G90=ABS" in codeLegend)
    check("G54=WCS" in codeLegend)
    check("G43=TLEN" in codeLegend)
    check("M3=SP-CW" in codeLegend)
    check("M8=COOL-ON" in codeLegend)
    check("G41=L-COMP" in codeLegend)
    check("G42=R-COMP" in codeLegend)
    check("M98=SUB-CALL" in codeLegend)
    check("M99=SUB-RET" in codeLegend)
    println("✓ NC_CODE_CATALOG_PASS G/M aliases locked")

    val lineProgram = """
        G21 G94 G97
        G90 G54 G43 H1 M8
        G92 X0 Y0
        G777.7 X1.000
    """.trimIndent()
    val line2 = NcCodeCatalog.lineHelp(lineProgram,2)
    check("G90=ABS [PROGRAM_MODE]" in line2)
    check("G54=WCS [WORK_OFFSET]" in line2)
    check("G43=TLEN [TOOL_LENGTH]" in line2)
    check("M8=COOL-ON [COOLANT]" in line2)
    check("SAFETY=PASS" in line2)
    val line3 = NcCodeCatalog.lineHelp(lineProgram,3)
    check("G92=TEMP-ORG [COORD_XFORM]" in line3)
    check("BLOCKED=G92_ORIGIN_UNVERIFIED" in line3)
    val line4 = NcCodeCatalog.lineHelp(lineProgram,4)
    check("G777.7=UNKNOWN [UNKNOWN]" in line4)
    check("UNKNOWN_GCODE_FAIL_CLOSED" in line4)
    check(NcCodeCatalog.lineNumberAt(lineProgram,lineProgram.indexOf("G92"))==3)
    println("✓ NC_LINE_HELP_PASS cursor-line alias/layer/meaning/safety")

    check(NcAnimationBridge.actionFor("G0")=="RAPID_MOVE")
    check(NcAnimationBridge.actionFor("G1")=="CUT_LINEAR")
    check(NcAnimationBridge.actionFor("G2")=="CUT_ARC_CW")
    check(NcAnimationBridge.actionFor("G3")=="CUT_ARC_CCW")
    check(NcAnimationBridge.actionFor("M3")=="SPINDLE_CW")
    check(NcAnimationBridge.actionFor("M8")=="COOLANT_FLOOD")
    check(NcAnimationBridge.actionFor("M6")=="TOOL_CHANGE")
    check(NcAnimationBridge.actionFor("G43.4")=="AXIS_5X_ORIENTATION")
    check(NcAnimationBridge.actionFor("G68.2")=="AXIS_5X_ORIENTATION")
    check(NcAnimationBridge.actionFor("M9")=="COOLANT_OFF")
    val animationReadyProgram = """
        G21 G94 G97 G90 G54 G17 G40 G49
        M3 M8
        G0 X0.000 Y0.000 Z5.000
        G1 X10.000 Y0.000 Z-1.000 F100.000
        G2 X10.000 Y10.000 I0.000 J5.000
        M9 M5 M30
    """.trimIndent()
    check("G0=>RAPID_MOVE" in NcAnimationBridge.lineEvidence(animationReadyProgram,3))
    check("G1=>CUT_LINEAR" in NcAnimationBridge.lineEvidence(animationReadyProgram,4))
    check("G2=>CUT_ARC_CW" in NcAnimationBridge.lineEvidence(animationReadyProgram,5))
    check("NC→3D ANIM READY" in NcAnimationBridge.programSummary(animationReadyProgram))
    check("G92_ORIGIN_UNVERIFIED" in NcAnimationBridge.programSummary("G21 G94 G97 G90 G54\nG92 X0 Y0"))
    check("UNKNOWN_GCODE_FAIL_CLOSED" in NcAnimationBridge.programSummary("G21 G94 G97 G90 G54\nG777.7 X1.000"))
    println("✓ NC_3D_ANIMATION_BRIDGE_PASS motion/aux/5X/fail-closed")

    val authoritySafe = NcSemanticAuthority.programSummary(animationReadyProgram,CncControllerProfile.FANUC)
    check("CONSENSUS PASS" in authoritySafe)
    val authorityLine = NcSemanticAuthority.lineEvidence(animationReadyProgram,3,CncControllerProfile.FANUC)
    check("AUTH=CONSENSUS_PASS" in authorityLine)
    check("G0=>RAPID_MOVE" in authorityLine)
    val authorityG92 = NcSemanticAuthority.programSummary(
        "G21 G94 G97 G90 G54\nG92 X0 Y0",
        CncControllerProfile.FANUC
    )
    check("SAFETY BLOCKED" in authorityG92 && "G92_ORIGIN_UNVERIFIED" in authorityG92)
    val authorityUnknown = NcSemanticAuthority.programSummary(
        "G21 G94 G97 G90 G54\nG777.7 X1.000",
        CncControllerProfile.FANUC
    )
    check("SAFETY BLOCKED" in authorityUnknown && "UNKNOWN_GCODE_FAIL_CLOSED" in authorityUnknown)
    check(NcSemanticAuthority.consistencyIssues(
        "G1", emptyList(), ControllerCapabilityStatus.MODELED_ALLOWED, "CUT_LINEAR"
    ).isEmpty())
    val forcedConflict = NcSemanticAuthority.consistencyIssues(
        "G777.7", emptyList(), ControllerCapabilityStatus.UNKNOWN_FAIL_CLOSED, "UNSUPPORTED"
    )
    check("UNKNOWN_NOT_FAIL_CLOSED:G777.7" in forcedConflict)
    check("CAPABILITY_UNKNOWN_NOT_BLOCKED:G777.7" in forcedConflict)
    check("ANIMATION_UNSUPPORTED_NOT_BLOCKED:G777.7" in forcedConflict)
    println("✓ NC_SEMANTIC_AUTHORITY_PASS single-truth/conflict/fail-closed")

    val timelineReady = NcExecutionTimeline.build(animationReadyProgram,CncControllerProfile.FANUC)
    check(timelineReady.isNotEmpty())
    check(timelineReady.all { it.status=="READY" })
    check(timelineReady.any { it.code=="G0" && NcExecutionDomain.MOTION_3D in it.domains })
    check(timelineReady.any { it.code=="G1" && NcExecutionDomain.MATERIAL_REMOVAL in it.domains })
    check(timelineReady.any { it.code=="M8" && NcExecutionDomain.COOLANT in it.domains })
    check("READY" in NcExecutionTimeline.programSummary(animationReadyProgram,CncControllerProfile.FANUC))

    val timeline5xProgram = """
        G21 G94 G97 G90 G54 G17 G40 G49
        G43.4 H1
        G68.2 X0.000 Y0.000 Z0.000 I0.000 J0.000 K0.000
        G0 X0.000 Y0.000 Z5.000
    """.trimIndent()
    val timeline5x = NcExecutionTimeline.build(timeline5xProgram,CncControllerProfile.FANUC)
    check(timeline5x.any { it.code=="G43.4" && NcExecutionDomain.AXIS_5X in it.domains })
    check(timeline5x.any { it.code=="G68.2" && NcExecutionDomain.AXIS_5X in it.domains })

    val timelineBlockedProgram = """
        G21 G94 G97 G90 G54
        G0 X0.000 Y0.000 Z5.000
        G92 X0 Y0
        G1 X10.000 Y0.000 Z-1.000 F100.000
        M8
    """.trimIndent()
    val blockedTimeline = NcExecutionTimeline.build(timelineBlockedProgram,CncControllerProfile.FANUC)
    check(blockedTimeline.any { it.lineNumber==3 && it.status=="BLOCKED" && "G92_ORIGIN_UNVERIFIED" in it.reasons })
    check(blockedTimeline.filter { it.lineNumber>3 }.all { it.status=="SKIPPED_AFTER_BLOCK" })
    check("HALTED AT L3" in NcExecutionTimeline.programSummary(timelineBlockedProgram,CncControllerProfile.FANUC))

    val timelineUnknownProgram = """
        G21 G94 G97 G90 G54
        G777.7 X1.000
        G1 X2.000 Y0.000 Z-1.000 F100.000
    """.trimIndent()
    val unknownTimeline = NcExecutionTimeline.build(timelineUnknownProgram,CncControllerProfile.FANUC)
    check(unknownTimeline.any { it.lineNumber==2 && it.status=="BLOCKED" && "UNKNOWN_GCODE_FAIL_CLOSED" in it.reasons })
    check(unknownTimeline.filter { it.lineNumber>2 }.all { it.status=="SKIPPED_AFTER_BLOCK" })
    println("✓ NC_EXECUTION_TIMELINE_PASS nc/3d/sim/5x/safety-lockstep")

    val verifiedTravel = NcMachineTravelLimits.verified(
        xMin=-500.0, xMax=500.0,
        yMin=-300.0, yMax=300.0,
        zMin=-200.0, zMax=200.0,
        aMin=-110.0, aMax=110.0,
        bMin=-30.0, bMax=120.0
    )

    val overTravelProgram = """
        G21 G94 G97 G90 G54
        G0 X400.000 Y0.000 Z5.000
        X600.000
        G1 X450.000 Y0.000 Z-1.000 F100.000
        M8
    """.trimIndent()
    val overTravelTimeline = NcExecutionTimeline.build(
        overTravelProgram,CncControllerProfile.FANUC,verifiedTravel
    )
    check(overTravelTimeline.any {
        it.lineNumber==3 && it.code=="INPUT" && it.status=="BLOCKED" &&
            "AXIS_X_TRAVEL_LIMIT_EXCEEDED" in it.reasons &&
            NcExecutionDomain.MOTION_3D in it.domains &&
            NcExecutionDomain.MATERIAL_REMOVAL in it.domains &&
            NcExecutionDomain.AXIS_5X in it.domains
    })
    check(overTravelTimeline.filter { it.lineNumber>3 }.all { it.status=="SKIPPED_AFTER_BLOCK" })
    check("HALTED AT L3" in NcExecutionTimeline.programSummary(
        overTravelProgram,CncControllerProfile.FANUC,verifiedTravel
    ))

    val correctedTravelProgram = overTravelProgram.replace("X600.000","X480.000")
    check(NcRuntimeInterlock.status(correctedTravelProgram,verifiedTravel)=="PASS")
    check(NcExecutionTimeline.build(
        correctedTravelProgram,CncControllerProfile.FANUC,verifiedTravel
    ).none { it.status=="BLOCKED" || it.status=="SKIPPED_AFTER_BLOCK" })

    val incrementalOverTravel = """
        G21 G94 G97 G90 G54
        G0 X400.000 Y0.000 Z5.000
        G91
        X150.000
        G90
        G1 X450.000 Y0.000 Z-1.000 F100.000
    """.trimIndent()
    val incrementalTimeline = NcExecutionTimeline.build(
        incrementalOverTravel,CncControllerProfile.FANUC,verifiedTravel
    )
    check(incrementalTimeline.any {
        it.lineNumber==4 && it.status=="BLOCKED" &&
            "AXIS_X_TRAVEL_LIMIT_EXCEEDED" in it.reasons
    })
    val correctedIncremental = incrementalOverTravel.replace("X150.000","X50.000")
    check(NcRuntimeInterlock.status(correctedIncremental,verifiedTravel)=="PASS")

    val malformedNumeric = """
        G21 G94 G97 G90 G54
        G0 X0.000 Y0.000 Z5.000
        G1 X12..3 Y0.000 Z-1.000 F100.000
        M8
    """.trimIndent()
    val malformedTimeline = NcExecutionTimeline.build(
        malformedNumeric,CncControllerProfile.FANUC,verifiedTravel
    )
    check(malformedTimeline.any {
        it.lineNumber==3 && it.status=="BLOCKED" &&
            "MALFORMED_NUMERIC_WORD_X" in it.reasons
    })
    check(malformedTimeline.filter { it.lineNumber>3 }.all { it.status=="SKIPPED_AFTER_BLOCK" })
    val correctedNumeric = malformedNumeric.replace("X12..3","X12.300")
    check(NcRuntimeInterlock.status(correctedNumeric,verifiedTravel)=="PASS")

    val rotaryOverTravel = """
        G21 G94 G97 G90 G54
        G0 A111.000 B0.000
        G1 X0.000 Y0.000 Z-1.000 F100.000
    """.trimIndent()
    check(NcRuntimeInterlock.findings(rotaryOverTravel,verifiedTravel).any {
        it.lineNumber==2 && it.code=="AXIS_A_TRAVEL_LIMIT_EXCEEDED"
    })
    println("✓ NC_RUNTIME_INTERLOCK_PASS malformed/absolute/G91/5X-overtravel/correct-and-resume")

    val interlockSession = NcMachineInterlockSession(verifiedTravel)
    val alarmed = interlockSession.inspect(overTravelProgram)
    check(alarmed.state == NcMachineInterlockState.ALARM_LATCHED)
    check(alarmed.feedHold && !alarmed.canExecute)
    check("AXIS_X_TRAVEL_LIMIT_EXCEEDED" in alarmed.alarmCodes)
    check("ALARM_LATCHED" in alarmed.evidence())
    check("FEED_HOLD=ON" in alarmed.evidence())
    check("AXIS_X_TRAVEL_LIMIT_EXCEEDED" in alarmed.evidence())

    val correctedButLatched = interlockSession.inspect(correctedTravelProgram)
    check(correctedButLatched.state == NcMachineInterlockState.RESET_REQUIRED)
    check(correctedButLatched.feedHold)
    check(interlockSession.resume().state == NcMachineInterlockState.RESET_REQUIRED)

    val afterReset = interlockSession.reset()
    check(afterReset.state == NcMachineInterlockState.REVALIDATE_REQUIRED)
    check(afterReset.feedHold)

    val badRevalidation = interlockSession.revalidate(overTravelProgram)
    check(badRevalidation.state == NcMachineInterlockState.ALARM_LATCHED)
    check(badRevalidation.feedHold)

    check(interlockSession.inspect(correctedTravelProgram).state == NcMachineInterlockState.RESET_REQUIRED)
    check(interlockSession.reset().state == NcMachineInterlockState.REVALIDATE_REQUIRED)
    val resumeAllowed = interlockSession.revalidate(correctedTravelProgram)
    check(resumeAllowed.state == NcMachineInterlockState.RESUME_ALLOWED)
    check(resumeAllowed.feedHold)
    val resumed = interlockSession.resume()
    check(resumed.state == NcMachineInterlockState.READY)
    check(resumed.canExecute && !resumed.feedHold)
    check("READY" in resumed.evidence() && "FEED_HOLD=OFF" in resumed.evidence())
    println("✓ NC_MACHINE_ALARM_RECOVERY_PASS latched/feed-hold/reset/revalidate/resume")

    val boundaryCases = listOf(
        Triple('X', -500.0, 500.0),
        Triple('Y', -300.0, 300.0),
        Triple('Z', -200.0, 200.0),
        Triple('A', -110.0, 110.0),
        Triple('B', -30.0, 120.0)
    )
    boundaryCases.forEach { (axis, minValue, maxValue) ->
        val minProgram = "G21 G94 G97 G90 G54\nG0 " + axis + "%.3f".format(java.util.Locale.US,minValue)
        val maxProgram = "G21 G94 G97 G90 G54\nG0 " + axis + "%.3f".format(java.util.Locale.US,maxValue)
        check(NcRuntimeInterlock.status(minProgram,verifiedTravel)=="PASS")
        check(NcRuntimeInterlock.status(maxProgram,verifiedTravel)=="PASS")

        val underProgram = "G21 G94 G97 G90 G54\nG0 " + axis + "%.3f".format(java.util.Locale.US,minValue-0.001)
        val overProgram = "G21 G94 G97 G90 G54\nG0 " + axis + "%.3f".format(java.util.Locale.US,maxValue+0.001)
        val code = "AXIS_" + axis + "_TRAVEL_LIMIT_EXCEEDED"
        check(NcRuntimeInterlock.findings(underProgram,verifiedTravel).any { it.code==code })
        check(NcRuntimeInterlock.findings(overProgram,verifiedTravel).any { it.code==code })
    }

    val exactG91Boundary = """
        G21 G94 G97 G90 G54
        G0 X499.999 Y0.000 Z0.000
        G91
        X0.001
    """.trimIndent()
    check(NcRuntimeInterlock.status(exactG91Boundary,verifiedTravel)=="PASS")

    val g91OneMicronPast = exactG91Boundary + "\nX0.001"
    check(NcRuntimeInterlock.findings(g91OneMicronPast,verifiedTravel).any {
        it.lineNumber==5 && it.code=="AXIS_X_TRAVEL_LIMIT_EXCEEDED"
    })

    val simultaneousOverTravel = """
        G21 G94 G97 G90 G54
        G0 X500.001 Y300.001 Z200.001
    """.trimIndent()
    val simultaneousCodes = NcRuntimeInterlock.findings(simultaneousOverTravel,verifiedTravel).map { it.code }.toSet()
    check(setOf(
        "AXIS_X_TRAVEL_LIMIT_EXCEEDED",
        "AXIS_Y_TRAVEL_LIMIT_EXCEEDED",
        "AXIS_Z_TRAVEL_LIMIT_EXCEEDED"
    ).all { it in simultaneousCodes })

    val malformedVariants = listOf(
        "G1 X+ Y0.000 Z-1.000 F100.000",
        "G1 X--1.000 Y0.000 Z-1.000 F100.000",
        "G1 X1E3 Y0.000 Z-1.000 F100.000",
        "G1 X. Y0.000 Z-1.000 F100.000"
    )
    malformedVariants.forEach { line ->
        val p = "G21 G94 G97 G90 G54\n" + line
        check(NcRuntimeInterlock.findings(p,verifiedTravel).isNotEmpty())
        check(NcExecutionTimeline.build(p,CncControllerProfile.FANUC,verifiedTravel).any { it.status=="BLOCKED" })
    }

    val repeatedAlarmSession = NcMachineInterlockSession(verifiedTravel)
    check(repeatedAlarmSession.inspect(overTravelProgram).state==NcMachineInterlockState.ALARM_LATCHED)
    check(repeatedAlarmSession.inspect(overTravelProgram).state==NcMachineInterlockState.ALARM_LATCHED)
    check(repeatedAlarmSession.resume().state==NcMachineInterlockState.ALARM_LATCHED)
    check(repeatedAlarmSession.reset().state==NcMachineInterlockState.REVALIDATE_REQUIRED)
    check(repeatedAlarmSession.resume().state==NcMachineInterlockState.REVALIDATE_REQUIRED)
    check(repeatedAlarmSession.revalidate(correctedTravelProgram).state==NcMachineInterlockState.RESUME_ALLOWED)
    check(repeatedAlarmSession.revalidate(correctedTravelProgram).state==NcMachineInterlockState.RESUME_ALLOWED)
    check(repeatedAlarmSession.resume().state==NcMachineInterlockState.READY)

    val longSafeIncrementalProgram = buildString {
        appendLine("G21 G94 G97 G90 G54")
        appendLine("G0 X0.000 Y0.000 Z0.000")
        appendLine("G91")
        repeat(500) { appendLine("X0.001") }
        appendLine("G90")
    }.trim()
    check(NcRuntimeInterlock.status(longSafeIncrementalProgram,verifiedTravel)=="PASS")
    println("✓ NC_MACHINE_BOUNDARY_MATRIX_PASS XYZAB/min-max/0.001/G91/multi-axis/malformed/alarm-order")

    val duplicateAxisProgram = """
        G21 G94 G97 G90 G54
        G1 X1.000 X2.000 Y0.000 Z-1.000 F100.000
    """.trimIndent()
    val duplicateAxisFindings = NcRuntimeInterlock.findings(duplicateAxisProgram,verifiedTravel)
    check(duplicateAxisFindings.any { it.lineNumber==2 && it.code=="DUPLICATE_AXIS_WORD_X" })
    check(NcExecutionTimeline.build(
        duplicateAxisProgram,CncControllerProfile.FANUC,verifiedTravel
    ).any { it.lineNumber==2 && it.status=="BLOCKED" })

    val commentOnlyOutOfRange = """
        G21 G94 G97 G90 G54
        (X999999.000 Y999999.000 Z999999.000)
        G0 X0.000 Y0.000 Z0.000
    """.trimIndent()
    check(NcRuntimeInterlock.status(commentOnlyOutOfRange,verifiedTravel)=="PASS")

    val lowercaseAndWhitespace = "g21 g94 g97 g90 g54\n\tg0   x1.000   y-2.000   z3.000"
    check(NcRuntimeInterlock.status(lowercaseAndWhitespace,verifiedTravel)=="PASS")

    val stabilityRanges = mapOf(
        'X' to (-500.0 to 500.0),
        'Y' to (-300.0 to 300.0),
        'Z' to (-200.0 to 200.0),
        'A' to (-110.0 to 110.0),
        'B' to (-30.0 to 120.0)
    )
    val rng = kotlin.random.Random(0xA1C0FFEE.toInt())
    var safeSamples = 0
    var blockedSamples = 0
    repeat(750) {
        val axis = stabilityRanges.keys.elementAt(rng.nextInt(stabilityRanges.size))
        val (minValue,maxValue) = stabilityRanges.getValue(axis)
        val safeValue = minValue + rng.nextDouble() * (maxValue-minValue)
        val safeProgram = "G21 G94 G97 G90 G54\nG0 " + axis +
            "%.6f".format(java.util.Locale.US,safeValue)
        check(NcRuntimeInterlock.status(safeProgram,verifiedTravel)=="PASS")
        safeSamples++

        val delta = 0.001 + rng.nextDouble() * 25.0
        val blockedValue = if (rng.nextBoolean()) maxValue + delta else minValue - delta
        val blockedProgram = "G21 G94 G97 G90 G54\nG0 " + axis +
            "%.6f".format(java.util.Locale.US,blockedValue)
        val expectedCode = "AXIS_" + axis + "_TRAVEL_LIMIT_EXCEEDED"
        check(NcRuntimeInterlock.findings(blockedProgram,verifiedTravel).any { it.code==expectedCode })
        check(NcExecutionTimeline.build(
            blockedProgram,CncControllerProfile.FANUC,verifiedTravel
        ).any { it.status=="BLOCKED" && expectedCode in it.reasons })
        blockedSamples++
    }
    check(safeSamples==750 && blockedSamples==750)

    repeat(100) { cycle ->
        val session = NcMachineInterlockSession(verifiedTravel)
        val bad = "G21 G94 G97 G90 G54\nG0 X" +
            "%.3f".format(java.util.Locale.US,500.001 + cycle * 0.001)
        val good = "G21 G94 G97 G90 G54\nG0 X" +
            "%.3f".format(java.util.Locale.US,499.000 - cycle * 0.001)
        check(session.inspect(bad).state==NcMachineInterlockState.ALARM_LATCHED)
        check(session.inspect(good).state==NcMachineInterlockState.RESET_REQUIRED)
        check(session.reset().state==NcMachineInterlockState.REVALIDATE_REQUIRED)
        check(session.revalidate(good).state==NcMachineInterlockState.RESUME_ALLOWED)
        check(session.resume().state==NcMachineInterlockState.READY)
        check(session.current().canExecute)
    }

    val longModeFlipProgram = buildString {
        appendLine("G21 G94 G97 G90 G54")
        appendLine("G0 X0.000 Y0.000 Z0.000")
        repeat(250) {
            appendLine("G91 X0.001 Y-0.001 Z0.001")
            appendLine("G90 X0.000 Y0.000 Z0.000")
        }
    }.trim()
    repeat(10) {
        check(NcRuntimeInterlock.status(longModeFlipProgram,verifiedTravel)=="PASS")
    }
    println("✓ NC_MACHINE_STABILITY_STRESS_PASS 1500-random/100-alarm-cycles/duplicate-axis/250-mode-flips")

    val modalConflictCases = listOf(
        "G90 G91" to "CONFLICTING_MODAL_GROUP_PROGRAM_MODE",
        "G20 G21" to "CONFLICTING_MODAL_GROUP_UNITS",
        "G93 G94" to "CONFLICTING_MODAL_GROUP_FEED_MODE",
        "G17 G18" to "CONFLICTING_MODAL_GROUP_PLANE",
        "G40 G41" to "CONFLICTING_MODAL_GROUP_CUTTER_COMP",
        "G43 G49" to "CONFLICTING_MODAL_GROUP_TOOL_LENGTH",
        "G54 G55" to "CONFLICTING_MODAL_GROUP_WORK_OFFSET",
        "G80 G81" to "CONFLICTING_MODAL_GROUP_FIXED_CYCLE",
        "G98 G99" to "CONFLICTING_MODAL_GROUP_CYCLE_RETURN",
        "G61 G64" to "CONFLICTING_MODAL_GROUP_PATH_CONTROL",
        "G96 G97" to "CONFLICTING_MODAL_GROUP_SPINDLE_SPEED_MODE"
    )
    modalConflictCases.forEach { (codes,expected) ->
        val p = "G21 G94 G97 G90 G54\n" + codes + " X0.000 Y0.000 Z0.000"
        val findings = NcRuntimeInterlock.findings(p,verifiedTravel)
        check(findings.any { it.lineNumber==2 && it.code==expected })
        check(NcExecutionTimeline.build(
            p,CncControllerProfile.FANUC,verifiedTravel
        ).any { it.lineNumber==2 && it.status=="BLOCKED" && expected in it.reasons })
    }

    val duplicateAddressCases = listOf(
        "F100.000 F200.000" to "DUPLICATE_ADDRESS_F",
        "S1000 S2000" to "DUPLICATE_ADDRESS_S",
        "T1 T2" to "DUPLICATE_ADDRESS_T",
        "H1 H2" to "DUPLICATE_ADDRESS_H",
        "D1 D2" to "DUPLICATE_ADDRESS_D",
        "I1.000 I2.000" to "DUPLICATE_ADDRESS_I",
        "J1.000 J2.000" to "DUPLICATE_ADDRESS_J",
        "K1.000 K2.000" to "DUPLICATE_ADDRESS_K",
        "R1.000 R2.000" to "DUPLICATE_ADDRESS_R",
        "Q1.000 Q2.000" to "DUPLICATE_ADDRESS_Q",
        "P1 P2" to "DUPLICATE_ADDRESS_P"
    )
    duplicateAddressCases.forEach { (words,expected) ->
        val p = "G21 G94 G97 G90 G54\nG1 X1.000 Y2.000 Z-1.000 " + words
        check(NcRuntimeInterlock.findings(p,verifiedTravel).any { it.code==expected })
    }

    val inlineCommentProgram =
        "G21 G94 G97 G90 G54\n" +
        "G1 X1.000 (G91 X999999.000 M30) Y2.000 Z-1.000 M8\n" +
        "G1 X2.000 (NOTE) Y3.000 Z-2.000 M9"
    check(NcRuntimeInterlock.status(inlineCommentProgram,verifiedTravel)=="PASS")
    check("G91" !in NcModalTracker.codes(inlineCommentProgram).map { it.second })
    check("M30" !in NcAuxiliaryTracker.codes(inlineCommentProgram).map { it.second })
    check("G1" in NcModalTracker.codes(inlineCommentProgram).map { it.second })
    check("M8" in NcAuxiliaryTracker.codes(inlineCommentProgram).map { it.second })
    check("M9" in NcAuxiliaryTracker.codes(inlineCommentProgram).map { it.second })

    val commentSeparatedConflict =
        "G21 G94 G97 G90 G54\nG90 (COMMENT ONLY) G91 X0.000"
    check(NcRuntimeInterlock.findings(commentSeparatedConflict,verifiedTravel).any {
        it.code=="CONFLICTING_MODAL_GROUP_PROGRAM_MODE"
    })
    check(NcModalTracker.codes(commentSeparatedConflict).map { it.second }.count { it=="G90" || it=="G91" } >= 2)

    val crlfProgram = "G21 G94 G97 G90 G54\r\nG0 X1.000 Y-2.000 Z3.000\r\nM8\r\nM9\r\n"
    check(NcRuntimeInterlock.status(crlfProgram,verifiedTravel)=="PASS")
    check(NcAuxiliaryTracker.finalState(crlfProgram).coolant=="M9")

    val semicolonCommentProgram =
        "G21 G94 G97 G90 G54\nG0 X1.000 Y2.000 Z3.000 ; X999999.000 G91 M30"
    check(NcRuntimeInterlock.status(semicolonCommentProgram,verifiedTravel)=="PASS")
    check("G91" !in NcModalTracker.codes(semicolonCommentProgram).map { it.second })
    check("M30" !in NcAuxiliaryTracker.codes(semicolonCommentProgram).map { it.second })

    val blockSkipProgram =
        "G21 G94 G97 G90 G54\n/G1 X1.000 Y2.000 Z-1.000 F100.000\n/M8"
    check(NcRuntimeInterlock.status(blockSkipProgram,verifiedTravel)=="PASS")
    check("G1" in NcModalTracker.codes(blockSkipProgram).map { it.second })
    check("M8" in NcAuxiliaryTracker.codes(blockSkipProgram).map { it.second })

    val signedZeroProgram =
        "G21 G94 G97 G90 G54\nG0 X-0.000 Y+0.000 Z-0.000 A-0.000 B+0.000"
    check(NcRuntimeInterlock.status(signedZeroProgram,verifiedTravel)=="PASS")

    val fiveThousandBlockProgram = buildString {
        appendLine("G21 G94 G97 G90 G54")
        appendLine("G0 X0.000 Y0.000 Z0.000")
        appendLine("G91")
        repeat(5000) { appendLine("X0.001") }
        appendLine("G90")
    }.trim()
    check(NcRuntimeInterlock.status(fiveThousandBlockProgram,verifiedTravel)=="PASS")
    check(NcExecutionTimeline.build(
        fiveThousandBlockProgram,CncControllerProfile.FANUC,verifiedTravel
    ).none { it.status=="BLOCKED" || it.status=="SKIPPED_AFTER_BLOCK" })

    val cleanRecovery = NcMachineInterlockSession(verifiedTravel)
    check(cleanRecovery.inspect(overTravelProgram).state==NcMachineInterlockState.ALARM_LATCHED)
    check(cleanRecovery.inspect(correctedTravelProgram).state==NcMachineInterlockState.RESET_REQUIRED)
    check(cleanRecovery.reset().state==NcMachineInterlockState.REVALIDATE_REQUIRED)
    check(cleanRecovery.revalidate(correctedTravelProgram).state==NcMachineInterlockState.RESUME_ALLOWED)
    val cleanReady = cleanRecovery.resume()
    check(cleanReady.state==NcMachineInterlockState.READY)
    check(cleanReady.alarmCodes.isEmpty() && cleanReady.alarmLine==null && cleanReady.canExecute)
    println("✓ NC_PARSER_CONFLICT_STRESS_PASS modal-groups/duplicate-address/comments/CRLF/block-skip/5000-block/recovery-clean")

    val preparedAuthority = NcSemanticAuthority.resolveProgram(inlineCommentProgram,CncControllerProfile.FANUC)
    inlineCommentProgram.split("\n").indices.forEach { index ->
        val direct = NcSemanticAuthority.resolveLine(
            inlineCommentProgram,index+1,CncControllerProfile.FANUC
        )
        val prepared = preparedAuthority[index]
        check(direct.codes==prepared.codes)
        check(direct.safetyCodes==prepared.safetyCodes)
        check(direct.conflictCodes==prepared.conflictCodes)
        check(direct.animationEvidence==prepared.animationEvidence)
    }

    val timelineStartedNs = System.nanoTime()
    val performanceTimeline = NcExecutionTimeline.build(
        fiveThousandBlockProgram,CncControllerProfile.FANUC,verifiedTravel
    )
    val timelineElapsedMs = (System.nanoTime()-timelineStartedNs)/1_000_000L
    check(performanceTimeline.isNotEmpty())
    check(performanceTimeline.none { it.status=="BLOCKED" || it.status=="SKIPPED_AFTER_BLOCK" })
    check(timelineElapsedMs < 30_000L) {
        "5000-block execution timeline performance regression: " + timelineElapsedMs + "ms"
    }
    println("✓ NC_TIMELINE_LINEAR_PRECOMPUTE_PASS 5000-block/prepared-authority/<30s")

    val valueDomainCases = listOf(
        "G1 X1.000 Y0.000 Z-1.000 F0" to "FEED_NONPOSITIVE",
        "G1 X1.000 Y0.000 Z-1.000 F-10.000" to "FEED_NONPOSITIVE",
        "S-100" to "SPINDLE_SPEED_NEGATIVE",
        "T-1" to "INVALID_INTEGER_WORD_T",
        "T1.5" to "INVALID_INTEGER_WORD_T",
        "H-1" to "INVALID_INTEGER_WORD_H",
        "H1.5" to "INVALID_INTEGER_WORD_H",
        "D-1" to "INVALID_INTEGER_WORD_D",
        "D1.5" to "INVALID_INTEGER_WORD_D",
        "M3 M4" to "CONFLICTING_AUX_GROUP_SPINDLE",
        "M3 M5" to "CONFLICTING_AUX_GROUP_SPINDLE",
        "M0 M30" to "CONFLICTING_AUX_GROUP_PROGRAM_CONTROL",
        "M98 P4 M99" to "CONFLICTING_AUX_GROUP_SUBPROGRAM_FLOW"
    )
    valueDomainCases.forEach { (line,expected) ->
        val p = "G21 G94 G97 G90 G54\n" + line
        val findings = NcRuntimeInterlock.findings(p,verifiedTravel)
        check(findings.any { it.lineNumber==2 && it.code==expected })
        check(NcExecutionTimeline.build(
            p,CncControllerProfile.FANUC,verifiedTravel
        ).any { it.lineNumber==2 && it.status=="BLOCKED" && expected in it.reasons })
    }

    val validValueDomainProgram = """
        G21 G94 G97 G90 G54
        T0
        H0
        D0
        S0
        G1 X1.000 Y2.000 Z-1.000 F0.001
        M3
        M8
        M9
        M5
        M30
    """.trimIndent()
    check(NcRuntimeInterlock.status(validValueDomainProgram,verifiedTravel)=="PASS")
    println("✓ NC_CONTROLLER_VALUE_DOMAIN_PASS feed/spindle/tool-index/M-code-conflict")

    val parameterIntegrityCases = listOf(
        "N10.5 G0 X0.000" to "INVALID_INTEGER_WORD_N",
        "O100.5" to "INVALID_INTEGER_WORD_O",
        "G34 I0.000 J0 K50.000" to "G34_INVALID_HOLE_COUNT_J",
        "G34 I0.000 J4 K0.000" to "G34_INVALID_RADIUS_K",
        "G83 X0.000 Y0.000 Z-10.000 Q0.000 F100.000" to "PECK_Q_NONPOSITIVE",
        "G2 X10.000 Y0.000 R5.000 I5.000" to "ARC_CENTER_FORMAT_CONFLICT",
        "G3 X10.000 Y0.000 F100.000" to "ARC_CENTER_MISSING",
        "G1 X0.000 (BROKEN" to "MALFORMED_COMMENT",
        "G1 X0.000 )" to "MALFORMED_COMMENT",
        "G1 X0.000 (A(B)C)" to "NESTED_COMMENT_UNSUPPORTED"
    )
    parameterIntegrityCases.forEach { (body, expected) ->
        val p = "G21 G94 G97 G90 G54\n" + body
        val findings = NcRuntimeInterlock.findings(p,verifiedTravel)
        check(findings.any { it.code==expected }) { expected + " missing for " + body }
        check(NcExecutionTimeline.build(p,CncControllerProfile.FANUC,verifiedTravel).any {
            it.status=="BLOCKED" && expected in it.reasons
        })
    }

    val validParameterPrograms = listOf(
        "G21 G94 G97 G90 G54\nN10 G0 X0.000 Y0.000 Z5.000",
        "O1000\nG21 G94 G97 G90 G54",
        "G21 G94 G97 G90 G54\nG34 I15.000 J6 K50.000",
        "G21 G94 G97 G90 G54\nG83 X0.000 Y0.000 Z-10.000 Q1.000 F100.000",
        "G21 G94 G97 G90 G54\nG2 X10.000 Y0.000 I5.000 J0.000 F100.000",
        "G21 G94 G97 G90 G54\nG3 X10.000 Y0.000 R5.000 F100.000",
        "G21 G94 G97 G90 G54\nG1 X0.000 (SAFE COMMENT) Y0.000 Z0.000"
    )
    validParameterPrograms.forEach { p ->
        check(NcRuntimeInterlock.status(p,verifiedTravel)=="PASS") { p }
    }

    val repairedComment = "G21 G94 G97 G90 G54\nG1 X0.000 (BROKEN)"
    val repairSession = NcMachineInterlockSession(verifiedTravel)
    check(repairSession.inspect("G21 G94 G97 G90 G54\nG1 X0.000 (BROKEN").state==NcMachineInterlockState.ALARM_LATCHED)
    check(repairSession.inspect(repairedComment).state==NcMachineInterlockState.RESET_REQUIRED)
    check(repairSession.reset().state==NcMachineInterlockState.REVALIDATE_REQUIRED)
    check(repairSession.revalidate(repairedComment).state==NcMachineInterlockState.RESUME_ALLOWED)
    check(repairSession.resume().state==NcMachineInterlockState.READY)
    println("✓ NC_PARAMETER_INTEGRITY_PASS labels/comments/G34/peck/arc/recovery")

    check(SoftwareCoordinateContract.machineAuxiliaryResponsibilityLayers() == listOf(
        "SPINDLE=M3_M4_M5_EXECUTION_LAYER",
        "COOLANT=M7_M8_M9_EXECUTION_LAYER",
        "TOOL_CHANGE=M6_NONMODAL_LAYER",
        "SPINDLE_ORIENT=M19_CONTROLLER_LAYER",
        "PROGRAM_STOP=M0_M1_CONTROL_LAYER",
        "SUBPROGRAM=M98_M99_CALL_RETURN_LAYER",
        "PROGRAM_END=M2_M30_CONTROL_LAYER"
    ))
    val auxProgram = """
        G21 G94 G97 G90 G54 G17 G40 G49
        M3
        M8
        M98 P4
        M9
        M5
        M30
    """.trimIndent()
    val auxEvents = NcAuxiliaryTracker.trace(auxProgram)
    check(auxEvents.any { it.code=="M3" && it.group=="SPINDLE" })
    check(auxEvents.any { it.code=="M8" && it.group=="COOLANT" })
    check(auxEvents.any { it.code=="M98" && it.group=="SUBPROGRAM_CALL" })
    check(auxEvents.any { it.code=="M30" && it.group=="PROGRAM_END" })
    check(NcAuxiliaryTracker.finalState(auxProgram).spindle=="M5")
    check(NcAuxiliaryTracker.finalState(auxProgram).coolant=="M9")
    check(NcAuxiliaryTracker.finalState(auxProgram).programControl=="M30")
    check(NcProgramSafetyPolicy.blocking(auxProgram).isEmpty())
    check(CncControllerCapabilityMatrix.classify(CncControllerProfile.FANUC,"M3").status == ControllerCapabilityStatus.MODELED_ALLOWED)
    check(CncControllerCapabilityMatrix.classify(CncControllerProfile.MITSUBISHI_M800_M80,"M19").status == ControllerCapabilityStatus.TRACKED_REVIEW)

    val blockedAux = """
        G21 G94 G97 G90 G54 G17 G40 G49
        M4
        M7
        M19
        M777
    """.trimIndent()
    val blockedAuxCodes = NcProgramSafetyPolicy.blocking(blockedAux).map { it.code }.toSet()
    check("M4_REVERSE_SPINDLE_UNVERIFIED" in blockedAuxCodes)
    check("M7_MIST_COOLANT_UNVERIFIED" in blockedAuxCodes)
    check("M19_SPINDLE_ORIENT_UNVERIFIED" in blockedAuxCodes)
    check("UNKNOWN_MCODE_FAIL_CLOSED" in blockedAuxCodes)
    println("✓ NC_AUXILIARY_TRACKER_PASS spindle/coolant/toolchange/subprogram/program-control")
}


private fun testNcModalTracker() {
    val program = """
        G21 G94 G97 G90 G54 G17 G40 G49 G64 G80 G98
        G91
        G92 X0 Y0
        G41 D1
        G43 H1
        G43.4 H1
        G54.2
        G54.4
        G53.1
        G41.2 D1
        G51 X2.000 Y2.000 Z2.000
        G51.1 X0.000
        G61.1
        G18
        G68
        G81 G99
        G53 G0 Z0
        G96
        G65 P1000
        G66.1 P2000
        G67
        G30.1
        G31.2 X1.000
        G52 X0.000 Y0.000
        G68.2 X0.000 Y0.000 Z0.000
        G92.1
        G42
        G49
        G69 G80 G98 G61 G97
        G04 P100
        G09
    """.trimIndent()
    val events = NcModalTracker.trace(program)
    check(events.any { it.code=="G30.1" && it.group=="REFERENCE_RETURN_NONMODAL" })
    check(events.any { it.code=="G31.2" && it.group=="SKIP_NONMODAL" })
    check(events.any { it.code=="G52" && it.group=="LOCAL_COORD_TRANSFORM" })
    check(events.any { it.code=="G65" && it.group=="MACRO_CALL_NONMODAL" })
    check(events.any { it.code=="G66.1" && it.group=="MACRO_MODE" })
    check(events.any { it.code=="G43.4" && it.group=="FIVE_AXIS_TOOL_CONTROL" })
    check(events.any { it.code=="G54.2" && it.group=="ROTARY_WORK_OFFSET" })
    check(events.any { it.code=="G54.4" && it.group=="WORKPIECE_INSTALL_ERROR_COMP" })
    check(events.any { it.code=="G53.1" && it.group=="TOOL_AXIS_DIRECTION" })
    check(events.any { it.code=="G41.2" && it.group=="THREE_D_CUTTER_COMP" })
    check(events.any { it.code=="G51" && it.group=="SCALING" })
    check(events.any { it.code=="G51.1" && it.group=="MIRROR" })
    check(events.any { it.code=="G61.1" && it.group=="HIGH_ACCURACY_PATH" })
    check(events.any { it.code=="G68.2" && it.group=="INCLINED_SURFACE_TRANSFORM" })
    check(events.any { it.code=="G92.1" && it.group=="WORK_COORD_PRESET_NONMODAL" })
    check(events.any { it.code=="G96" && it.group=="SPINDLE_SPEED_MODE" })
    check(events.any { it.code=="G97" && it.group=="SPINDLE_SPEED_MODE" })
    check(events.any { it.code=="G4" && it.group=="DWELL_NONMODAL" })
    check(events.any { it.code=="G9" && it.group=="EXACT_STOP_NONMODAL" })
    val final = NcModalTracker.finalState(program)
    check(final.coordinateMode=="G91")
    check(final.workOffset=="G54")
    check(final.temporaryOriginActive)
    check(final.units=="G21")
    check(final.feedMode=="G94")
    check(final.cutterCompensation=="G42")
    check(final.toolLengthCompensation=="G49")
    check(final.plane=="G18")
    check(final.coordinateRotation=="G69")
    check(final.fixedCycle=="G80")
    check(final.cycleReturn=="G98")
    check(final.pathControl=="G61")
    check(final.spindleSpeedMode=="G97")
    check(final.macroMode=="G67")
    check(NcModalTracker.evidence(program).contains("SPINDLE_MODE=G97"))
    check(NcModalTracker.evidence(program).contains("MACRO=G67"))
    check(NcModalTracker.evidence(program).contains("G92=ACTIVE|UNITS=G21"))
    check(NcModalTracker.evidence(program).contains("SPINDLE_MODE=G97|MACRO=G67"))
    println("NC_MODAL_EVIDENCE_NO_TRUNCATION_PASS|G92|UNITS|SPINDLE|MACRO")

    val safe = """
        %
        G21 G94 G97
        G90 G54 G17 G40 G49 G80 G98
        G0 G43 Z30.000 H1
        %
    """.trimIndent()
    check(NcModalSafetyPolicy.blocking(safe).isEmpty())

    val blocked = """
        G21 G94 G97 G90 G54
        G20
        G95
        G53 G0 Z0
        G68
        G92 X0 Y0
        G41 D1
        G99
        G28
        G31.2 X1.000
        G52 X0.000
        G66.1 P2000
        G68.2 X0.000 Y0.000 Z0.000
        G92.1
        G96
        G43.5 H1
        G53.6
        G54.1 P1
        G54.2
        G54.4
        G41.1
        G41.2 D1
        G51 X2.000 Y2.000 Z2.000
        G51.1 X0.000
        G61.2
    """.trimIndent()
    val blockedCodes = NcModalSafetyPolicy.blocking(blocked).map { it.code }.toSet()
    check(setOf(
        "G20_INCH_MODE",
        "G95_FEED_PER_REV_UNVERIFIED",
        "G53_MACHINE_COORD_UNSIMULATED",
        "G68_ROTATION_UNSIMULATED",
        "G92_ORIGIN_UNVERIFIED",
        "G41_G42_DOUBLE_COMP_RISK",
        "G99_RETURN_UNSIMULATED",
        "REFERENCE_RETURN_UNSIMULATED",
        "SKIP_PROBE_UNSIMULATED",
        "G52_LOCAL_COORD_UNVERIFIED",
        "USER_MACRO_UNEXPANDED",
        "INCLINED_SURFACE_UNSIMULATED",
        "WORK_COORD_PRESET_UNVERIFIED",
        "G96_CSS_UNVERIFIED",
        "FIVE_AXIS_TCP_UNSIMULATED",
        "TOOL_AXIS_DIRECTION_UNSIMULATED",
        "EXTENDED_WCS_UNVERIFIED",
        "ROTARY_WCS_OFFSET_UNSIMULATED",
        "WORKPIECE_INSTALL_COMP_UNSIMULATED",
        "NORMAL_LINE_CONTROL_UNSIMULATED",
        "THREE_D_CUTTER_COMP_UNSIMULATED",
        "SCALING_UNSIMULATED",
        "MIRROR_UNSIMULATED",
        "HIGH_ACCURACY_PATH_UNVERIFIED"
    ).all { it in blockedCodes })
    val unknown = """
        G21 G94 G97 G90 G54 G17 G40 G49
        G777.7 X1.000
    """.trimIndent()
    check(NcModalSafetyPolicy.blocking(unknown).any {
        it.code=="UNKNOWN_GCODE_FAIL_CLOSED" && it.lineNumber==2
    })
    check(NcModalSafetyPolicy.blocking(
        "G21 G94 G97 G90 G54 G17 G40 G49\nG34 I15.000 J6 K50.000"
    ).none { it.code=="UNKNOWN_GCODE_FAIL_CLOSED" })
    println("✓ NC_MODAL_TRACKER_PASS integer/decimal provenance + unknown G-code fail-closed")
}

private fun testCannedCycleReturnMode() {
    val cycle = FanucNc.cannedCycle(
        DrillCycle.G81,
        listOf(DrillHole(x=-10.0,y=5.0,z=-8.0,r=2.0,feed=120.0)),
        safeZ=10.0,
        retractZ=2.0
    )
    check("G98 G81" in cycle)
    check("G80" in cycle)
    check(NcModalSafetyPolicy.blocking(
        "G21 G94 G97 G90 G54 G17 G40 G49\nG43 Z30.000 H1\n" + cycle
    ).isEmpty())
    println("✓ CANNED_CYCLE_RETURN_PASS G98 explicit / G81 / G80")
    val pattern = FanucNc.circularHolePattern(15.0,6,50.0)
    check(pattern=="G34 I15. J6 K50.")
    check(NcRuntimeInterlock.status(
        "G21 G94 G97 G90 G54\n"+pattern
    )=="PASS")
    check(runCatching { FanucNc.circularHolePattern(0.0,0,50.0) }.isFailure)
    check(runCatching { FanucNc.circularHolePattern(0.0,6,0.0) }.isFailure)
    println("✓ NC_G34_PATTERN_SEMANTICS_PASS I-angle/J-count/K-radius")
    val safeGeneratedProcess = """
        %
        O1000
        G21 G94 G97
        G90 G54 G17 G40 G49 G80
        T1
        M98 P4
        S2300 M3
        G0 G43 Z30.000 H1 M8
        G0 X0.000 Y0.000 Z5.000
        G1 X10.000 Y0.000 Z-1.000 F100.000
        G0 Z30.000
        G80
        M98 P5
        M30
        %
    """.trimIndent()
    check(NcGeneratedProcessGate.status(safeGeneratedProcess,5.0)=="PASS")

    fun processCodes(program:String)=NcGeneratedProcessGate.blocking(program,5.0).map{it.code}.toSet()
    check("CUT_WITH_SPINDLE_STOPPED" in processCodes(
        safeGeneratedProcess.replace("S2300 M3","S2300 M5")
    ))
    val noH = processCodes(safeGeneratedProcess.replace("G0 G43 Z30.000 H1 M8","G43 Z30.000 M8"))
    check("G43_WITHOUT_H" in noH && "CUT_WITHOUT_G43_H" in noH)
    check("CUT_BEFORE_TOOL_CHANGE" in processCodes(
        safeGeneratedProcess.replace("M98 P4\n","")
    ))
    check("TOOL_CHANGE_CALL_SPINDLE_RUNNING" in processCodes(
        safeGeneratedProcess.replace("T1\nM98 P4\nS2300 M3","T1\nS2300 M3\nM98 P4")
    ))
    val lowRetract = processCodes(safeGeneratedProcess.replace("G0 Z30.000\nG80\nM98 P5","G0 Z1.000\nG80\nM98 P5"))
    check("RAPID_BELOW_SAFE_Z" in lowRetract && "END_CALL_BELOW_SAFE_Z" in lowRetract)
    check("EXECUTION_AFTER_M30" in processCodes(safeGeneratedProcess + "\nG0 X1.000"))
    check("TOOL_CHANGE_SPINDLE_RUNNING" in processCodes(
        "T2\nM3\nM6"
    ))
    val activeCycleAtEnd = """
        G21 G94 G97 G90 G54
        T1
        M98 P4
        S1000 M3
        G0 G43 Z30.000 H1
        G83 X0.000 Y0.000 Z-5.000 R2.000 Q1.000 F100.000
        G0 Z30.000
        M98 P5
        M30
    """.trimIndent()
    check("CYCLE_ACTIVE_AT_END_CALL" in processCodes(activeCycleAtEnd))
    println("✓ NC_GENERATED_PROCESS_GATE_PASS spindle/toolchange/G43/safeZ/cycle/end-order")
    val good5xProcess = """
        G21 G94 G97 G90 G54
        T1
        M98 P4
        G0 G43 Z30.000 H1
        G0 A30.000 B-15.000
        S2300 M3
        G1 X1.000 Y0.000 Z-1.000 F100.000
        G0 Z30.000
        G80
        M98 P5
        M30
    """.trimIndent()
    check(NcGeneratedProcessGate.status(good5xProcess,5.0)=="PASS")
    check("G43_WITHOUT_G0_APPROACH" in processCodes(
        good5xProcess.replace("G0 G43 Z30.000 H1","G43 Z30.000 H1")
    ))
    val rotaryBelowSafe = """
        G21 G94 G97 G90 G54
        T1
        M98 P4
        G0 G43 Z30.000 H1
        G0 Z1.000
        G0 A30.000 B-15.000
        S2300 M3
        G1 X1.000 Y0.000 Z-1.000 F100.000
        G0 Z30.000
        G80
        M98 P5
        M30
    """.trimIndent()
    check("ROTARY_MOVE_BELOW_SAFE_Z" in processCodes(rotaryBelowSafe))
    val rotaryWithSpindle = good5xProcess.replace(
        "G0 A30.000 B-15.000\nS2300 M3",
        "S2300 M3\nG0 A30.000 B-15.000"
    )
    check("ROTARY_MOVE_SPINDLE_RUNNING" in processCodes(rotaryWithSpindle))
    println("✓ NC_5X_PROCESS_ORDER_PASS G0-G43/safeZ/rotary-before-spindle")

    val multiToolStaleH = """
        G21 G94 G97 G90 G54
        T1
        M98 P4
        G0 G43 Z30.000 H1
        S2000 M3
        G1 X1.000 Y0.000 Z-1.000 F100.000
        M5
        G0 Z30.000
        T2
        M98 P4
        S1800 M3
        G1 X2.000 Y0.000 Z-1.000 F100.000
        G0 Z30.000
        G80
        M98 P5
        M30
    """.trimIndent()
    check("CUT_WITHOUT_G43_H" in processCodes(multiToolStaleH))

    val multiToolCorrected = multiToolStaleH.replace(
        "T2\nM98 P4\nS1800 M3",
        "T2\nM98 P4\nG0 G43 Z30.000 H2\nS1800 M3"
    )
    check(NcGeneratedProcessGate.status(multiToolCorrected,5.0)=="PASS")

    val badCycleR = safeGeneratedProcess.replace(
        "G1 X10.000 Y0.000 Z-1.000 F100.000",
        "G81 X10.000 Y0.000 Z-5.000 R-6.000 F100.000"
    )
    check("CYCLE_R_NOT_ABOVE_Z" in processCodes(badCycleR))

    val noCycleR = safeGeneratedProcess.replace(
        "G1 X10.000 Y0.000 Z-1.000 F100.000",
        "G83 X10.000 Y0.000 Z-5.000 Q1.000 F100.000"
    )
    check("CYCLE_WITHOUT_R" in processCodes(noCycleR))

    val noCycleZ = safeGeneratedProcess.replace(
        "G1 X10.000 Y0.000 Z-1.000 F100.000",
        "G83 X10.000 Y0.000 R2.000 Q1.000 F100.000"
    )
    check("CYCLE_WITHOUT_Z" in processCodes(noCycleZ))

    val badTapFeed = safeGeneratedProcess.replace(
        "G1 X10.000 Y0.000 Z-1.000 F100.000",
        "G84 X10.000 Y0.000 Z-5.000 R2.000 F0.000"
    )
    check("G84_INVALID_FEED" in processCodes(badTapFeed))

    val goodTap = safeGeneratedProcess.replace(
        "G1 X10.000 Y0.000 Z-1.000 F100.000",
        "G84 X10.000 Y0.000 Z-5.000 R2.000 F500.000"
    )
    check("CYCLE_R_NOT_ABOVE_Z" !in processCodes(goodTap))
    check("G84_INVALID_FEED" !in processCodes(goodTap))
    println("✓ NC_MULTI_TOOL_CYCLE_SAFETY_PASS stale-H/R-Z/G84")

    val effectProgram = """
        G21 G94 G97 G90 G54 G17 G40 G49 G80
        T1
        M6
        G0 G43 Z30.000 H1
        M3
        M8
        G0 X0.000 Y0.000 Z5.000
        G1 X10.000 Y0.000 Z-1.000 F100.000
        G2 X20.000 Y0.000 I5.000 J0.000
        G3 X10.000 Y0.000 R5.000
        G81 X0.000 Y0.000 Z-5.000 R2.000 F100.000
        G80
        M9
        M5
        M30
    """.trimIndent()
    check(NcControlEffectPolicy.blocking(effectProgram).isEmpty()) {
        NcControlEffectPolicy.evidence(effectProgram)
    }

    val stateOnlyProgram = """
        G21 G94 G97 G90 G54 G17 G40 G49 G80 G98 G61
    """.trimIndent()
    check(NcControlEffectPolicy.blocking(stateOnlyProgram).isEmpty()) {
        NcControlEffectPolicy.evidence(stateOnlyProgram)
    }

    check(NcControlEffectPolicy.consistencyIssues(
        "G90",
        blockedBySafety=false,
        modalGroup=null,
        auxiliaryGroup=null,
        animationAction="STATE_SYNC"
    ) == listOf("NO_EFFECT_CONTROL_CODE:G90"))

    check(NcControlEffectPolicy.consistencyIssues(
        "G90",
        blockedBySafety=false,
        modalGroup="PROGRAM_MODE",
        auxiliaryGroup=null,
        animationAction="STATE_SYNC"
    ).isEmpty())

    check(NcControlEffectPolicy.consistencyIssues(
        "M8",
        blockedBySafety=false,
        modalGroup=null,
        auxiliaryGroup="COOLANT",
        animationAction="COOLANT_FLOOD"
    ).isEmpty())

    check(NcControlEffectPolicy.consistencyIssues(
        "G92",
        blockedBySafety=true,
        modalGroup="TEMP_ORIGIN",
        auxiliaryGroup=null,
        animationAction="STATE_SYNC"
    ).isEmpty())
    println("✓ NC_CONTROL_EFFECT_GATE_PASS no-fake-control/state/aux/motion/cycle/fail-closed")

}

private fun assertPoint(actual: Vec2, expected: Vec2, msg: String = "") {
    assertNear(actual.x, expected.x, msg = "$msg x")
    assertNear(actual.y, expected.y, msg = "$msg y")
}

fun main() {
    println("AIG Studio core regression tests")
    testSoftwareAbsoluteCoordinateContract()
    testNcModalTracker()
    testCannedCycleReturnMode()
    testDeleteDoesNotInventTriangle()
    testUndoRedo()
    testChamferC5()
    testFilletR5()
    testDifferentCornerRadii()
    testRejectOversizeCorner()
    testRejectMidSegmentCorner()
    testTransformRoundTrip()
    testCamSnapshotIsIsolated()
    testDataSyncDesyncContract()
    testPackageBundleContract()
    testEnvironmentSettingsContract()
    testRealCamToolpath()
    testWorkOffsetDoesNotShiftAbsoluteCoordinates()
    testControllerProfilesDoNotShiftAbsoluteCoordinates()
    testG91PostPreservesCanonicalAbsoluteCoordinates()
    testG92TemporaryOriginIsPostOnlyAndFailClosed()
    testControllerCutterCompensationDoubleApplyBlocked()
    testMaterialRemoval3D()
    testMachiningMesh3D()
    testAigIiPrecisionContract()
    testAiGapToleranceContract()
    testMicronDisplayScale()
    testRenderCachePolicyStress()
    testRgbMaxStressProfilerContract()
    testHomeWorkstationChromeContract()
    testFloatingCadToolContract()
    testRgbGlassVisualContract()
    println("ALL TESTS PASSED")
}

private fun rectangle(): List<Line> = listOf(
    Line(id="L1", a=Vec2(0.0,0.0), b=Vec2(100.0,0.0)),
    Line(id="L2", a=Vec2(100.0,0.0), b=Vec2(100.0,50.0)),
    Line(id="L3", a=Vec2(100.0,50.0), b=Vec2(0.0,50.0)),
    Line(id="L4", a=Vec2(0.0,50.0), b=Vec2(0.0,0.0))
)

private fun testDeleteDoesNotInventTriangle() {
    val d = DrawingDocument(); rectangle().forEach(d::put)
    val h = History(d)
    h.run(DeleteEntityCommand("L2"))
    check(d.size() == 3) { "Miracle triangle bug: deleting one side must leave exactly 3 entities" }
    check(d.get("L2") == null)
    check(d.all().all { it is Line })
    println("✓ triangle-miracle regression")
}

private fun testUndoRedo() {
    val d = DrawingDocument(); rectangle().forEach(d::put)
    val h = History(d)
    h.run(DeleteEntityCommand("L2")); check(d.size()==3)
    check(h.undo()); check(d.size()==4 && d.get("L2") != null)
    check(h.redo()); check(d.size()==3 && d.get("L2") == null)
    println("✓ undo/redo")
}

private fun testChamferC5() {
    val l1 = Line(id="A", a=Vec2(0.0,0.0), b=Vec2(100.0,0.0))
    val l2 = Line(id="B", a=Vec2(0.0,0.0), b=Vec2(0.0,100.0))
    val r = Geometry.chamfer(l1,l2,5.0)
    assertPoint(r.first.a, Vec2(5.0,0.0), "C5 first")
    assertPoint(r.second.a, Vec2(0.0,5.0), "C5 second")
    check(r.bridge.length > 7.0 && r.bridge.length < 7.1)
    println("✓ C5 true geometry")
}

private fun testFilletR5() {
    val l1 = Line(id="A", a=Vec2(0.0,0.0), b=Vec2(100.0,0.0))
    val l2 = Line(id="B", a=Vec2(0.0,0.0), b=Vec2(0.0,100.0))
    val r = Geometry.fillet(l1,l2,5.0)
    assertPoint(r.first.a, Vec2(5.0,0.0), "R5 first tangent")
    assertPoint(r.second.a, Vec2(0.0,5.0), "R5 second tangent")
    assertPoint(r.arc.center, Vec2(5.0,5.0), "R5 center")
    assertNear(r.arc.center.distanceTo(r.arc.start), 5.0, msg="R5 start radius")
    assertNear(r.arc.center.distanceTo(r.arc.end), 5.0, msg="R5 end radius")
    println("✓ R5 true tangent geometry")
}


private fun testDifferentCornerRadii() {
    val leftH = Line(id="LH", a=Vec2(0.0,0.0), b=Vec2(40.0,0.0))
    val leftV = Line(id="LV", a=Vec2(0.0,0.0), b=Vec2(0.0,40.0))
    val left = Geometry.fillet(leftH,leftV,5.0)
    assertNear(left.arc.radius, 5.0, msg="left R5")

    val rightH = Line(id="RH", a=Vec2(60.0,0.0), b=Vec2(100.0,0.0))
    val rightV = Line(id="RV", a=Vec2(100.0,0.0), b=Vec2(100.0,40.0))
    val right = Geometry.fillet(rightH,rightV,10.0)
    assertNear(right.arc.radius, 10.0, msg="right R10")
    check(left.arc.radius != right.arc.radius)
    println("✓ independent R5 / R10 corners")
}


private fun testRejectOversizeCorner() {
    val h = Line(id="H", a=Vec2(0.0,0.0), b=Vec2(10.0,0.0))
    val v = Line(id="V", a=Vec2(0.0,0.0), b=Vec2(0.0,10.0))
    check(runCatching { Geometry.chamfer(h, v, 12.0) }.isFailure)
    check(runCatching { Geometry.fillet(h, v, 12.0) }.isFailure)
    println("✓ oversized C/R rejected")
}

private fun testRejectMidSegmentCorner() {
    val h = Line(id="H", a=Vec2(-10.0,0.0), b=Vec2(10.0,0.0))
    val v = Line(id="V", a=Vec2(0.0,-10.0), b=Vec2(0.0,10.0))
    check(runCatching { Geometry.chamfer(h, v, 2.0) }.isFailure)
    check(runCatching { Geometry.fillet(h, v, 2.0) }.isFailure)
    println("✓ crossing lines are not mistaken for editable corners")
}

private fun testTransformRoundTrip() {
    val t = WorldTransform(500.0, 700.0, 8.0)
    val p = Vec2(12.5,-7.25)
    assertPoint(t.screenToWorld(t.worldToScreen(p)), p, "transform round trip")
    val focus = Vec2(300.0,300.0)
    val w = t.screenToWorld(focus)
    t.zoomAt(focus, 1.75)
    assertPoint(t.screenToWorld(focus), w, "zoom focus")
    println("✓ one coordinate system")
}

private fun testCamSnapshotIsIsolated() {
    val d = DrawingDocument(); rectangle().forEach(d::put)
    val cam = CamModel.fromCad(1, d.snapshot())
    d.remove("L2")
    check(d.size()==3)
    check(cam.geometry.entities.size==4) { "CAM snapshot must not be mutated by later CAD edits" }
    println("✓ CAD/CAM isolation")
}

private fun testDataSyncDesyncContract() {
    val doc = DrawingDocument()
    rectangle().forEach(doc::put)
    val sourceRevision = 10L
    val snapshot = doc.snapshot()
    val cam = CamModel.fromCad(sourceRevision, snapshot, CamSettings(toolDiameter=6.0, depth=-2.0, safeZ=8.0, feedMmMin=180.0))
    check(cam.sourceRevision == sourceRevision)
    check(cam.geometry.entities.size == doc.size())
    val removal = MaterialRemoval3D.simulate(cam.toolpaths, cam.settings, Stock3D.fromSnapshot(cam.geometry))
    check(removal.depth.any { it < 0.0 })

    doc.remove("L2")
    check(doc.size() == 3)
    check(cam.geometry.entities.size == 4) { "Existing CAM snapshot must remain immutable after CAD mutation" }

    val newSnapshot = doc.snapshot()
    check(newSnapshot.entities.size == 3)
    check(newSnapshot != cam.geometry) { "Changed CAD must not masquerade as synchronized CAM geometry" }
    val rebuilt = CamModel.fromCad(sourceRevision + 1L, newSnapshot, cam.settings)
    check(rebuilt.sourceRevision != cam.sourceRevision)
    check(rebuilt.geometry.entities.size == 3)

    val changedSettings = cam.settings.copy(feedMmMin = 181.0)
    val toolChanged = CamModel.fromCad(sourceRevision + 2L, newSnapshot, changedSettings)
    check(toolChanged.settings.feedMmMin != rebuilt.settings.feedMmMin)
    check(toolChanged.sourceRevision != rebuilt.sourceRevision)

    println("✓ DATA_SYNC_DESYNC_GATE_PASS CAD→CAM→SIM revision/snapshot/tool-change")
}

private fun testPackageBundleContract() {
    val official = StudioPackageRegistry.official
    val all = official.packages.map { it.id }.toSet()
    val requiredAiSuite = setOf(
        "ai-voice","ai-command-router","voice-safety-confirm",
        "system-monitor-hud","performance-telemetry","thermal-guard",
        "renderer-governor","software-absolute-coordinate",
            "ai-health","ai-system-suite"
    )
    check(all.containsAll(requiredAiSuite)) { "AI SYSTEM SUITE packages missing: " + (requiredAiSuite - all) }
    check(StudioPackageRegistry.validate(official, all).ok)
    check(runCatching { StudioPackageRegistry.requireHealthy(official, all) }.isSuccess)

    val missingCad = all - "cad-core"
    val broken = StudioPackageRegistry.validate(official, missingCad)
    check(!broken.ok)
    check(broken.missingDependencies.any { it.contains("cam-core->cad-core") || it.contains("mesh-3d-renderer->cad-core") })
    check(runCatching { StudioPackageRegistry.requireHealthy(official, missingCad) }.isFailure)

    val cadCore = official.packages.single { it.id == "cad-core" }
    val duplicate = official.copy(packages = official.packages + cadCore)
    check(StudioPackageRegistry.validate(duplicate, duplicate.packages.map { it.id }.toSet()).duplicatePackages.contains("cad-core"))
    println("✓ PACKAGE_BUNDLE_GATE_PASS dependencies / enable-disable / duplicate fail-closed")
}

private fun testEnvironmentSettingsContract() {
    val perf = RuntimeEnvironmentSettings(
        fpsMode=FpsMode.FPS_120,
        maxFps=120,
        rgbBrightness=65,
        glowLevel=GlowLevel.MEDIUM,
        powerMode=PowerMode.PERFORMANCE,
        renderQuality=RenderQuality.HIGH,
        hudEnabled=true
    )
    check(perf.targetFps(120.0,100,0,false)==120)
    check(perf.targetFps(60.0,100,0,false)==60)

    val auto = perf.copy(fpsMode=FpsMode.AUTO,powerMode=PowerMode.AUTO)
    check(auto.targetFps(120.0,15,0,false)==60)
    check(auto.targetFps(120.0,8,0,false)==30)
    check(auto.targetFps(120.0,80,4,false)==30)
    check(auto.targetFps(120.0,80,2,false)==60)
    check(auto.adaptiveTargetFps(120.0,80,0,false,true)==120)
    check(auto.adaptiveTargetFps(120.0,80,0,false,false)==30)
    check(auto.adaptiveTargetFps(120.0,80,2,false,true)==60)
    check(auto.adaptiveTargetFps(120.0,80,4,false,true)==30)
    check(auto.effectiveRgbBrightness(8,false)<=35)
    check(auto.effectiveRgbBrightness(15,false)<=50)
    check(auto.effectiveRgbBrightness(80,false)==65)
    CncPrecisionContract.assertRendererIsolation(auto)
    check(CNC_RESOLUTION_MM==0.001)
    check(PlatformRefreshPolicy.capForRuntime(120,false)==120)
    check(PlatformRefreshPolicy.capForRuntime(120,true)==60)
    check(PlatformRefreshPolicy.capForRuntime(60,true)==60)
    check(PlatformRefreshPolicy.visualLoadScale(true)<1.0)
    check(ThermalSensorPolicy.isCpuType("cpu-thermal"))
    check(ThermalSensorPolicy.isCpuType("cluster0"))
    check(ThermalSensorPolicy.isGpuType("gpu"))
    check(ThermalSensorPolicy.isGpuType("g3d"))
    check(ThermalSensorPolicy.normalizeCelsius(65000.0)==65.0)
    check(ThermalSensorPolicy.normalizeCelsius(65.0)==65.0)
    check(SettingsApplyPolicy.requiresRestart("High","Ultra"))
    check(!SettingsApplyPolicy.requiresRestart("High","high"))
    check(SettingsApplyPolicy.restartReason("Balanced","High")=="3D_SIM_RENDER_QUALITY")
    println("✓ ENVIRONMENT_SETTINGS_GATE_PASS 120/60/30/Auto RGB thermal battery precision-isolated")

    check(perf.targetFps(90.0,100,0,false)==90)
    check(auto.adaptiveTargetFps(90.0,80,0,false,true)==90)
    check(RuntimeEnvironmentSettings.normalizeFps(89)==60)
    check(RuntimeEnvironmentSettings.normalizeFps(90)==90)
    check(RuntimeEnvironmentSettings.normalizeFps(119)==90)
    check(RuntimeEnvironmentSettings.normalizeFps(120)==120)

    check(kotlin.math.abs(RenderFrameContract.budgetMs(120)-8.3333333333)<1e-6)
    check(kotlin.math.abs(RenderFrameContract.budgetMs(90)-11.1111111111)<1e-6)
    check(kotlin.math.abs(RenderFrameContract.budgetMs(60)-16.6666666667)<1e-6)
    check(kotlin.math.abs(RenderFrameContract.budgetMs(30)-33.3333333333)<1e-6)
    check(RenderFrameContract.displayBucket(120.0)==120)
    check(RenderFrameContract.displayBucket(90.0)==90)
    check(RenderFrameContract.displayBucket(60.0)==60)
    check(RenderFrameContract.isWithinBudget(8.0,120))
    check(!RenderFrameContract.isWithinBudget(12.0,120))

    val meter120=SurfaceFpsMeter(refreshHzProvider={120.0})
    var t120=1_000_000_000L
    meter120.record(t120)
    repeat(72){
        t120 += 8_333_333L
        meter120.record(t120)
    }
    check(meter120.current().fps in 118.0..122.0) { meter120.current().toString() }

    val meter60=SurfaceFpsMeter(refreshHzProvider={60.0})
    var t60=2_000_000_000L
    meter60.record(t60)
    repeat(36){
        t60 += 16_666_667L
        meter60.record(t60)
    }
    check(meter60.current().fps in 59.0..61.0) { meter60.current().toString() }

    val dropMeter=SurfaceFpsMeter(refreshHzProvider={120.0})
    dropMeter.record(3_000_000_000L)
    dropMeter.record(3_025_000_000L)
    check(dropMeter.current().droppedFrames>=2)
    println("✓ RENDER_SURFACE_FPS_GATE_PASS 30/60/90/120 budgets + per-surface meter + drop detection")

    check(CpuThermalFpsPolicy.capForTemperature(null)==120)
    check(CpuThermalFpsPolicy.capForTemperature(64.999)==120)
    check(CpuThermalFpsPolicy.capForTemperature(65.0)==90)
    check(CpuThermalFpsPolicy.capForTemperature(74.999)==90)
    check(CpuThermalFpsPolicy.capForTemperature(75.0)==60)
    check(CpuThermalFpsPolicy.capForTemperature(84.999)==60)
    check(CpuThermalFpsPolicy.capForTemperature(85.0)==30)
    check(CpuThermalFpsPolicy.capWithHysteresis(73.0,60)==60)
    check(CpuThermalFpsPolicy.capWithHysteresis(72.0,60)==90)
    check(CpuThermalFpsPolicy.capWithHysteresis(83.0,30)==30)
    check(CpuThermalFpsPolicy.capWithHysteresis(82.0,30)==60)
    check(CpuThermalFpsPolicy.capWithHysteresis(63.0,90)==90)
    check(CpuThermalFpsPolicy.capWithHysteresis(62.0,90)==120)
    check("CPU_TEMP_75.0C_CAP_60"==CpuThermalFpsPolicy.reason(75.0,60))
    println("✓ CPU_THERMAL_AUTO_FPS_PASS 120@<65 / 90@65 / 60@75 / 30@85 + hysteresis")

    check(RenderStressClassifier.modelScenario(0)==RenderStressScenario.SMALL_MODEL)
    check(RenderStressClassifier.modelScenario(1500)==RenderStressScenario.SMALL_MODEL)
    check(RenderStressClassifier.modelScenario(1501)==RenderStressScenario.MEDIUM_MODEL)
    check(RenderStressClassifier.modelScenario(6000)==RenderStressScenario.MEDIUM_MODEL)
    check(RenderStressClassifier.modelScenario(6001)==RenderStressScenario.LARGE_MODEL)

    RenderStressProfiler.reset()
    check(RenderStressProfiler.missingScenarios().size==5)
    repeat(5){
        RenderStressProfiler.record(
            RenderStressScenario.SMALL_MODEL,
            SurfaceFpsStats(120.0,8.2,60,0)
        )
        RenderStressProfiler.record(
            RenderStressScenario.MEDIUM_MODEL,
            SurfaceFpsStats(90.0,11.1,45,0)
        )
        RenderStressProfiler.record(
            RenderStressScenario.LARGE_MODEL,
            SurfaceFpsStats(58.0,17.3,29,1)
        )
        RenderStressProfiler.record(
            RenderStressScenario.MATERIAL_REMOVAL,
            SurfaceFpsStats(52.0,19.2,26,2)
        )
        RenderStressProfiler.record(
            RenderStressScenario.FIVE_AXIS_SYNC,
            SurfaceFpsStats(44.0,22.7,22,3)
        )
    }
    val stressSnapshot=RenderStressProfiler.snapshot()
    check(stressSnapshot.size==5)
    check(RenderStressProfiler.missingScenarios().isEmpty())
    check(RenderStressProfiler.heaviest()?.scenario==RenderStressScenario.FIVE_AXIS_SYNC)
    check((RenderStressProfiler.heaviest()?.averageFps ?: 0.0) in 43.9..44.1)
    check("COVERAGE=COMPLETE" in RenderStressProfiler.summary())
    check("HEAVIEST=FIVE_AXIS_SYNC" in RenderStressProfiler.summary())

    RenderStressProfiler.reset()
    RenderStressProfiler.record(
        RenderStressScenario.SMALL_MODEL,
        SurfaceFpsStats(120.0,8.2,60,2)
    )
    RenderStressProfiler.record(
        RenderStressScenario.SMALL_MODEL,
        SurfaceFpsStats(119.0,8.4,60,2)
    )
    RenderStressProfiler.record(
        RenderStressScenario.SMALL_MODEL,
        SurfaceFpsStats(118.0,8.6,60,3)
    )
    check(RenderStressProfiler.snapshot().single().totalDroppedFrames==3L)
    check("pending=" in RenderStressProfiler.summary())
    RenderStressProfiler.reset()
    println("✓ RENDER_STRESS_TIER_GATE_PASS small/medium/large/removal/5X/heaviest/drop-delta")
}

private fun testAigIiPrecisionContract() {
    check(CNC_RESOLUTION_MM == 0.001)
    check(JOIN_TOLERANCE_MM == 0.001)
    val p = Vec2(12.345, -7.891)
    val t = WorldTransform(500.0, 700.0, 8.0)
    val roundTrip = t.screenToWorld(t.worldToScreen(p))
    assertNear(roundTrip.x, p.x, eps=1e-9, msg="0.001 mm X precision")
    assertNear(roundTrip.y, p.y, eps=1e-9, msg="0.001 mm Y precision")

    val within = Line(id="J1", a=Vec2(0.0,0.0), b=Vec2(10.0,0.0))
    val mateWithin = Line(id="J2", a=Vec2(0.0009,0.0), b=Vec2(0.0009,10.0))
    check(runCatching { Geometry.chamfer(within, mateWithin, 1.0) }.isSuccess)

    val outside = Line(id="J3", a=Vec2(0.0,0.0), b=Vec2(10.0,0.0))
    val mateOutside = Line(id="J4", a=Vec2(0.0011,0.0), b=Vec2(0.0011,10.0))
    check(runCatching { Geometry.chamfer(outside, mateOutside, 1.0) }.isFailure)

    println("✓ AIG II 0.001 mm precision contract")
}

private fun testAiGapToleranceContract() {
    val within = DrawingSnapshot(listOf(
        Line(id="A", a=Vec2(0.0,0.0), b=Vec2(10.0,0.0)),
        Line(id="B", a=Vec2(0.0009,0.0), b=Vec2(0.0009,10.0))
    ))
    val withinIssues = AiCadInspector.inspect(within).issues
    check(withinIssues.any { it.code == "NEAR_GAP" }) { "0.0009 mm near-gap must be detected" }

    val outside = DrawingSnapshot(listOf(
        Line(id="C", a=Vec2(0.0,0.0), b=Vec2(10.0,0.0)),
        Line(id="D", a=Vec2(0.0011,0.0), b=Vec2(0.0011,10.0))
    ))
    val outsideIssues = AiCadInspector.inspect(outside).issues
    check(outsideIssues.none { it.code == "NEAR_GAP" }) { "0.0011 mm gap must not be classified as 0.001 mm near-gap" }

    println("✓ AI 0.001 mm near-gap contract")
}

private fun testMicronDisplayScale() {
    check(micronUnits(0.001) == 1L)
    check(micronUnits(0.010) == 10L)
    check(DisplayFormat.mm(10.0) == "10.000")
    check(DisplayFormat.mm(10.001) == "10.001")
    assertNear(mmFromMicronUnits(1), 0.001, eps=1e-12, msg="1u")
    assertNear(mmFromMicronUnits(10), 0.010, eps=1e-12, msg="10u")
    println("✓ 0.000 display scale = 1 micron per last digit")
}


private fun testRealCamToolpath() {
    val snap = DrawingSnapshot(rectangle())
    val settings = CamSettings(toolDiameter=6.0, depth=-3.0, safeZ=8.0, feedMmMin=180.0)
    val cam = CamModel.fromCad(2, snap, settings)
    check(cam.toolpaths.isNotEmpty()) { "CAM must generate real toolpaths" }
    val moves = cam.toolpaths.flatMap { it.moves }
    check(moves.any { !it.rapid && it.z < 0.0 }) { "CAM must contain cutting moves below Z0" }
    check(moves.filter { it.rapid }.all { it.z >= settings.safeZ }) { "All rapid moves must stay at safe-Z" }
    println("✓ real CAM toolpath + safe-Z")
}

private fun testMaterialRemoval3D() {
    val snap = DrawingSnapshot(rectangle())
    val settings = CamSettings(toolDiameter=6.0, depth=-3.0, safeZ=8.0, feedMmMin=180.0)
    val stock = Stock3D.fromSnapshot(snap, margin=8.0, thickness=20.0)
    val cam = CamModel.fromCad(3, snap, settings)
    val removal = MaterialRemoval3D.simulate(cam.toolpaths, settings, stock)
    check(removal.depth.any { it < 0.0 }) { "Material-removal field must contain cut cells" }
    check(removal.depth.min() <= settings.depth + 1e-9) { "Removal depth must reflect CAM cutting depth" }
    println("✓ true material-removal height field")
}

private fun testMachiningMesh3D() {
    val snap = DrawingSnapshot(rectangle())
    val result = Machining3DEngine.build(
        snap,
        CamSettings(toolDiameter=6.0, depth=-3.0, safeZ=8.0, feedMmMin=180.0)
    )
    check(result.mesh.vertices.size > 100) { "3D mesh must contain real surface vertices" }
    check(result.mesh.triangles.size > 100) { "3D mesh must contain real triangles" }
    check(result.mesh.vertices.any { it.z < 0.0 }) { "3D mesh must include machined depth" }
    println("✓ true 3D machining mesh")
}

private fun testWorkOffsetDoesNotShiftAbsoluteCoordinates() {
    val doc = DrawingDocument()
    rectangle().map {
        when (it.id) {
            "L1" -> it.copy(a=Vec2(-50.0,-40.0), b=Vec2(50.0,-40.0))
            "L2" -> it.copy(a=Vec2(50.0,-40.0), b=Vec2(50.0,40.0))
            "L3" -> it.copy(a=Vec2(50.0,40.0), b=Vec2(-50.0,40.0))
            else -> it.copy(a=Vec2(-50.0,40.0), b=Vec2(-50.0,-40.0))
        }
    }.forEach(doc::put)
    val snapshot = doc.snapshot()
    val cam = CamModel.fromCad(
        9001L,
        snapshot,
        CamSettings(toolDiameter=6.0, depth=-3.0, safeZ=5.0, feedMmMin=150.0)
    )
    val before = cam.toolpaths.map { tp -> tp.moves.map { Triple(it.to.x, it.to.y, it.z) } }
    val nc54 = FanucNc.generate(cam, FanucPostSettings(workOffset="G54"))
    val nc55 = FanucNc.generate(cam, FanucPostSettings(workOffset="G55"))
    val after = cam.toolpaths.map { tp -> tp.moves.map { Triple(it.to.x, it.to.y, it.z) } }

    check(before == after) { "NC work-offset selection must not mutate CAM absolute coordinates" }
    check("G90 G54" in nc54 && "G90 G55" in nc55)
    check(nc54.replace("G90 G54", "G90 G5X") == nc55.replace("G90 G55", "G90 G5X")) {
        "G54/G55 must change only the explicit NC work-offset selector"
    }
    check(nc54.contains("X-") || nc54.contains("Y-")) { "Signed negative NC coordinate evidence missing" }
    cam.toolpaths.flatMap { it.moves }.forEachIndexed { index, move ->
        val xyz = "X" + FanucNc.fmt(move.to.x) +
            " Y" + FanucNc.fmt(move.to.y) +
            " Z" + FanucNc.fmt(move.z)
        check(xyz in nc54) { "CAM→NC absolute XYZ mismatch at move " + index + ": " + xyz }
    }

    val first = cam.geometry.entities.first() as Line
    check(first.a == Vec2(-50.0,-40.0))
    check(first.b == Vec2(50.0,-40.0))
    MaterialRemoval3D.simulate(cam.toolpaths, cam.settings, Stock3D.fromSnapshot(cam.geometry))
    check(first.a == Vec2(-50.0,-40.0) && first.b == Vec2(50.0,-40.0)) {
        "SIM must not rewrite CAD absolute coordinates"
    }
    println("✓ WORK_OFFSET_NO_GEOMETRY_SHIFT_PASS G54/G55 CAM/SIM absolute coordinates unchanged")
}

private fun testControllerProfilesDoNotShiftAbsoluteCoordinates() {
    val snapshot = DrawingSnapshot(
        listOf(
            Line("M1",Vec2(-50.0,-40.0),Vec2(50.0,-40.0)),
            Line("M2",Vec2(50.0,-40.0),Vec2(50.0,40.0)),
            Line("M3",Vec2(50.0,40.0),Vec2(-50.0,40.0)),
            Line("M4",Vec2(-50.0,40.0),Vec2(-50.0,-40.0))
        )
    )
    val cam = CamModel.fromCad(
        9100L,
        snapshot,
        CamSettings(toolDiameter=6.0, depth=-3.0, safeZ=5.0, feedMmMin=150.0)
    )
    val before = cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) }
    val fanuc = CncPost.generate(
        cam,
        FanucPostSettings(workOffset="G54", controller=CncControllerProfile.FANUC)
    )
    val mitsubishi = CncPost.generate(
        cam,
        FanucPostSettings(workOffset="G54", controller=CncControllerProfile.MITSUBISHI_M800_M80)
    )
    val after = cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) }
    check(before == after)
    check("(CONTROLLER FANUC)" in fanuc)
    check("(CONTROLLER MITSUBISHI M800/M80)" in mitsubishi)
    check("G21 G94 G97" in fanuc)
    check("G21 G94 G97" in mitsubishi)
    check("G90 G54 G17 G40 G49 G80" in fanuc)
    check("G90 G54 G17 G40 G49 G80" in mitsubishi)
    before.forEachIndexed { index,p ->
        val xyz="X"+FanucNc.fmt(p.first)+" Y"+FanucNc.fmt(p.second)+" Z"+FanucNc.fmt(p.third)
        check(xyz in fanuc) { "Fanuc profile XYZ mismatch at " + index }
        check(xyz in mitsubishi) { "Mitsubishi profile XYZ mismatch at " + index }
    }
    println("✓ CONTROLLER_PROFILE_COORDINATE_PARITY_PASS FANUC/MITSUBISHI absolute XYZ unchanged")
}

private fun testG91PostPreservesCanonicalAbsoluteCoordinates() {
    val snapshot = DrawingSnapshot(
        listOf(Line("G91-L",Vec2(-50.0,-10.0),Vec2(50.0,-10.0)))
    )
    val cam = CamModel.fromCad(
        9200L,
        snapshot,
        CamSettings(toolDiameter=6.0, depth=-3.0, safeZ=5.0, feedMmMin=150.0)
    )
    val canonicalBefore = cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) }
    val absoluteNc = CncPost.generate(
        cam,
        FanucPostSettings(
            coordinateMode=NcCoordinateMode.ABSOLUTE_G90,
            cutterCompensation=CutterCompensationMode.CAM_GEOMETRY_G40
        )
    )
    val incrementalNc = CncPost.generate(
        cam,
        FanucPostSettings(
            coordinateMode=NcCoordinateMode.INCREMENTAL_G91,
            cutterCompensation=CutterCompensationMode.CAM_GEOMETRY_G40
        )
    )
    val canonicalAfter = cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) }
    check(canonicalBefore == canonicalAfter)
    check("(CANONICAL XYZ ABSOLUTE G90" in absoluteNc)
    check("(CANONICAL XYZ ABSOLUTE G90" in incrementalNc)
    check("(PROGRAM MODE G90 ABSOLUTE" in absoluteNc)
    check("(PROGRAM MODE G91 INCREMENTAL" in incrementalNc)
    check("\nG91\n" in incrementalNc)
    check("\nG90\n" in incrementalNc)
    check(canonicalBefore.any { it.first < 0.0 || it.second < 0.0 })
    println("✓ G91_POST_CANONICAL_ABS_PARITY_PASS canonical CAM XYZ unchanged")
}


private fun testG92TemporaryOriginIsPostOnlyAndFailClosed() {
    val snapshot = DrawingSnapshot(
        listOf(Line("G92-L",Vec2(-30.0,10.0),Vec2(30.0,10.0)))
    )
    val cam = CamModel.fromCad(
        9250L,
        snapshot,
        CamSettings(toolDiameter=6.0, depth=-2.0, safeZ=5.0, feedMmMin=120.0)
    )
    val canonicalBefore = cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) }
    val normal = CncPost.generate(
        cam,
        FanucPostSettings(originTransformMode=NcOriginTransformMode.WORK_OFFSET_ONLY)
    )
    check("(PROGRAM MODE G90 ABSOLUTE • ORIGIN G54-G59 WORK OFFSET" in normal)
    check(runCatching {
        CncPost.generate(
            cam,
            FanucPostSettings(originTransformMode=NcOriginTransformMode.TEMPORARY_G92)
        )
    }.isFailure)
    val canonicalAfter = cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) }
    check(canonicalBefore == canonicalAfter)
    println("✓ G92_POST_ONLY_GATE_PASS canonical CAM XYZ unchanged and NC fail-closed")
}

private fun testControllerCutterCompensationDoubleApplyBlocked() {
    val snapshot = DrawingSnapshot(
        listOf(Line("COMP-L",Vec2(-20.0,0.0),Vec2(20.0,0.0)))
    )
    val cam = CamModel.fromCad(
        9300L,
        snapshot,
        CamSettings(toolDiameter=10.0, depth=-2.0, safeZ=5.0, feedMmMin=120.0)
    )
    val canonical = cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) }
    check(runCatching {
        CncPost.generate(
            cam,
            FanucPostSettings(cutterCompensation=CutterCompensationMode.CONTROLLER_LEFT_G41)
        )
    }.isFailure)
    check(runCatching {
        CncPost.generate(
            cam,
            FanucPostSettings(cutterCompensation=CutterCompensationMode.CONTROLLER_RIGHT_G42)
        )
    }.isFailure)
    check(canonical == cam.toolpaths.flatMap { it.moves }.map { Triple(it.to.x,it.to.y,it.z) })
    println("✓ G41_G42_DOUBLE_COMP_BLOCK_PASS canonical CAM path preserved")
}



private fun testRenderCachePolicyStress() {
    val cache=RenderCachePolicy()
    check(cache.shouldRecord(0x1001L,1080,2400,false))
    repeat(10_000) {
        check(!cache.shouldRecord(0x1001L,1080,2400,true))
    }
    check(cache.recordings==1L)
    check(cache.cacheHits==10_000L)
    check(cache.hitRate()>0.9998)

    check(cache.shouldRecord(0x1002L,1080,2400,true))
    check(cache.recordings==2L)
    check(cache.shouldRecord(0x1002L,2400,1080,true))
    check(cache.recordings==3L)
    check(cache.shouldRecord(0x1002L,2400,1080,false))
    check(cache.recordings==4L)

    cache.invalidate()
    check(cache.shouldRecord(0x1002L,2400,1080,true))
    check(cache.recordings==5L)
    println("✓ RENDER_CACHE_STRESS_GATE_PASS 10000_STATIC_HITS SCENE_RESIZE_BACKEND_INVALIDATION")
}


private fun testRgbMaxStressProfilerContract() {
    RgbMaxStressProfiler.reset()
    repeat(20) { i ->
        RgbMaxStressProfiler.record(
            RgbStressMode.RGB_OFF,
            RgbStressSample(120.0,8.3,22.0,35.0,i.toLong()/10,false)
        )
        RgbMaxStressProfiler.record(
            RgbStressMode.RGB_MAX,
            RgbStressSample(116.0,8.7,25.0,36.0,i.toLong()/8,false)
        )
    }
    val c=RgbMaxStressProfiler.comparison() ?: error("RGB A/B comparison missing")
    check(c.fpsDelta in -4.1..-3.9)
    check(c.frameTimeDeltaMs in 0.39..0.41)
    check(c.cpuDeltaPercent in 2.9..3.1)
    check(c.temperatureDeltaC != null && c.temperatureDeltaC in 0.99..1.01)
    check(!c.hardwareEvidence)
    check("DEVICE=PENDING" in RgbMaxStressProfiler.summary())
    RgbMaxStressProfiler.reset()
    println("✓ RGB_MAX_STRESS_PROFILER_GATE_PASS A/B_DELTA DROP_DELTA SYNTHETIC_ONLY NO_FAKE_DEVICE_CLAIM")
}


private fun testHomeWorkstationChromeContract() {
    check(WorkstationChromeContract.BRAND=="AIG CNC")
    check(WorkstationChromeContract.WORKSTATION=="CNC AI WORKSTATION")
    check(WorkstationChromeContract.ORIGINAL=="OFFICIAL RGB ORIGINAL")
    check("2D CAD" in WorkstationChromeContract.WORKSPACE)
    check("X0.000" in WorkstationChromeContract.MASTER_ORIGIN)
    check(WorkstationChromeContract.PRECISION=="0.001 mm")
    check(WorkstationChromeContract.layout(360,780)==WorkstationChromeContract.Layout.COMPACT)
    check(WorkstationChromeContract.layout(780,360)==WorkstationChromeContract.Layout.COMPACT)
    check(WorkstationChromeContract.layout(1280,720)==WorkstationChromeContract.Layout.WIDE)
    check(WorkstationChromeContract.requiredSections()==setOf("BRAND","WORKSPACE","STATUS","FUNCTIONS"))
    println("✓ HOME_WORKSTATION_UI_GATE_PASS BRAND WORKSPACE STATUS FUNCTIONS COMPACT WIDE")
}


private fun testFloatingCadToolContract() {
    check(FloatingCadToolContract.TITLE=="CAD TOOL DECK")
    check(FloatingCadToolContract.BACK=="BACK")
    check(FloatingCadToolContract.CLOSE=="CLOSE")
    check(FloatingCadToolContract.REOPEN=="TOOLS")
    check(FloatingCadToolContract.groups==listOf("CAD","VIEW","PHOTO","CORNER","EDIT","FILE"))
    check(FloatingCadToolContract.panelWidthDp(360)==336)
    check(FloatingCadToolContract.panelWidthDp(540)==360)
    check(FloatingCadToolContract.panelWidthDp(1280)==430)
    check(FloatingCadToolContract.overlayPreservesWorkspace(true))
    check(FloatingCadToolContract.overlayPreservesWorkspace(false))
    println("✓ CAD_FLOATING_TOOL_GATE_PASS OVERLAY BACK CLOSE REOPEN WORKSPACE_PRESERVED")
}


private fun testRgbGlassVisualContract() {
    check(RgbGlassVisualContract.LAYER_COUNT==3)
    check(RgbGlassVisualContract.strokeDp(false,false,false,false)==2.0)
    check(RgbGlassVisualContract.strokeDp(false,false,true,false)==3.2)
    check(RgbGlassVisualContract.strokeDp(false,true,false,false)==3.6)
    check(RgbGlassVisualContract.strokeDp(false,false,false,true)==4.0)
    check(RgbGlassVisualContract.strokeDp(true,false,false,false)==1.2)
    check(RgbGlassVisualContract.elevationDp(false,false,true,false)==9.0)
    check(RgbGlassVisualContract.elevationDp(false,false,false,true)==11.0)
    check(RgbGlassVisualContract.highlightAlpha(0,false,false)==0)
    check(RgbGlassVisualContract.highlightAlpha(100,true,false)==58)
    check(RgbGlassVisualContract.highlightAlpha(0,true,true)==92)
    check(RgbGlassVisualContract.alarmVisibleAtBrightness(0))
    println("✓ RGB_GLASS_STYLE_GATE_PASS 3_LAYER SELECTED PRESSED DISABLED ALARM BRIGHTNESS_SAFE")
}
