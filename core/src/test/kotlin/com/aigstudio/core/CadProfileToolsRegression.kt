package com.aigstudio.core

import kotlin.math.abs

fun main() {
    val open=CadProfileTools.polyline(listOf(Vec2(0.0,0.0),Vec2(10.0,0.0),Vec2(10.0,5.0)),closed=false)
    check(open.size==2)
    val openReport=CadProfileTools.analyze(open)
    check(!openReport.closed && openReport.openEnds==2)

    val closed=CadProfileTools.polyline(listOf(Vec2(0.0,0.0),Vec2(10.0,0.0),Vec2(10.0,5.0)),closed=true)
    check(closed.size==3)
    val closedReport=CadProfileTools.analyze(closed)
    check(closedReport.closed && closedReport.openEnds==0 && closedReport.branchNodes==0)

    val slot=CadProfileTools.slot(Vec2(0.0,0.0),20.0,6.0,0.0)
    check(slot.size==4)
    check(CadProfileTools.analyze(slot).closed)

    val joined=CadProfileTools.join(
        Line(a=Vec2(0.0,0.0),b=Vec2(10.0,0.0)),
        Line(a=Vec2(10.0004,0.0),b=Vec2(20.0,0.0))
    )
    check(joined.first.b.distanceTo(joined.second.a)<1e-12)
    check(runCatching {
        CadProfileTools.join(
            Line(a=Vec2(0.0,0.0),b=Vec2(10.0,0.0)),
            Line(a=Vec2(10.002,0.0),b=Vec2(20.0,0.0))
        )
    }.isFailure)

    val pieces=CadProfileTools.breakLine(Line(a=Vec2(0.0,0.0),b=Vec2(10.0,0.0)),4.0)
    check(abs(pieces.first.length-4.0)<1e-9)
    check(abs(pieces.second.length-6.0)<1e-9)

    println("STUDIO_CAD_PROFILE_TOOLS_PASS|POLYLINE|SLOT|CLOSED_CONTOUR|JOIN|BREAK")
}
