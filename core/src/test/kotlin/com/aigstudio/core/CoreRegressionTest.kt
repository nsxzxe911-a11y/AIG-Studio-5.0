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
    println("✓ ABSOLUTE_COORDINATE_DATA_GATE_PASS G90 MASTER=X0.000/Y0.000/Z0.000 SIGNED=TRUE SIM_OFFSET_SHIFT=OFF SIM_TOLERANCE_SHIFT=OFF")
}

private fun assertPoint(actual: Vec2, expected: Vec2, msg: String = "") {
    assertNear(actual.x, expected.x, msg = "$msg x")
    assertNear(actual.y, expected.y, msg = "$msg y")
}

fun main() {
    println("AIG Studio core regression tests")
    testSoftwareAbsoluteCoordinateContract()
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

    val first = cam.geometry.entities.first() as Line
    check(first.a == Vec2(-50.0,-40.0))
    check(first.b == Vec2(50.0,-40.0))
    MaterialRemoval3D.simulate(cam.toolpaths, cam.settings, Stock3D.fromSnapshot(cam.geometry))
    check(first.a == Vec2(-50.0,-40.0) && first.b == Vec2(50.0,-40.0)) {
        "SIM must not rewrite CAD absolute coordinates"
    }
    println("✓ WORK_OFFSET_NO_GEOMETRY_SHIFT_PASS G54/G55 CAM/SIM absolute coordinates unchanged")
}

