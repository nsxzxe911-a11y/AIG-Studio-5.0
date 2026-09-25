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

    val safe = """
        %
        G21 G94 G97
        G90 G54 G17 G40 G49 G80 G98
        G43 Z30.000 H1
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
        "G21 G94 G97 G90 G54 G17 G40 G49\nG34 X0.000 Y0.000 Z-1.000 K4 F100.000"
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
    check(nc54.replace("G54", "G5X") == nc55.replace("G55", "G5X")) {
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

