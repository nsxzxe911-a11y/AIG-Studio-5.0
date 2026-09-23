package com.aigstudio.core

import kotlin.math.abs

private fun assertNear(actual: Double, expected: Double, eps: Double = 1e-6, msg: String = "") {
    check(abs(actual - expected) <= eps) { "$msg expected=$expected actual=$actual" }
}
private fun assertPoint(actual: Vec2, expected: Vec2, msg: String = "") {
    assertNear(actual.x, expected.x, msg = "$msg x")
    assertNear(actual.y, expected.y, msg = "$msg y")
}

fun main() {
    println("AIG Studio 5.0 core regression tests")
    testDeleteDoesNotInventTriangle()
    testUndoRedo()
    testChamferC5()
    testFilletR5()
    testDifferentCornerRadii()
    testRejectOversizeCorner()
    testRejectMidSegmentCorner()
    testTransformRoundTrip()
    testCamSnapshotIsIsolated()
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
