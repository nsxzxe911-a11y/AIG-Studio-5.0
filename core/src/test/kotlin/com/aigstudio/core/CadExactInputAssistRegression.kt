package com.aigstudio.core

import kotlin.math.abs

private fun nearCadAssist(a:Double,b:Double,tol:Double=1e-9)=abs(a-b)<=tol

fun main() {
    val line=CadExactInputEngine.lineEndpoints(1.0,2.0,4.0,6.0).single() as CadExactLine
    check(nearCadAssist(line.a.x,1.0) && nearCadAssist(line.a.y,2.0))
    check(nearCadAssist(line.b.x,4.0) && nearCadAssist(line.b.y,6.0))

    val polar=CadExactInputEngine.linePolar(1.0,2.0,10.0,90.0).single() as CadExactLine
    check(nearCadAssist(polar.b.x,1.0,1e-8))
    check(nearCadAssist(polar.b.y,12.0,1e-8))

    val rect=CadExactInputEngine.rectangle(5.0,6.0,20.0,10.0)
    check(rect.size==4 && rect.all{it is CadExactLine})
    check((rect[0] as CadExactLine).a==CadExactPoint(5.0,6.0))
    check((rect[2] as CadExactLine).b==CadExactPoint(5.0,16.0))

    val circle=CadExactInputEngine.circleDiameter(3.0,4.0,20.0).single() as CadExactCircle
    check(nearCadAssist(circle.radius,10.0) && !circle.hole)
    val hole=CadExactInputEngine.holeDiameter(-2.0,8.0,6.0).single() as CadExactCircle
    check(nearCadAssist(hole.radius,3.0) && hole.hole)

    val arc=CadExactInputEngine.arcDegrees(0.0,0.0,5.0,0.0,90.0,false).single() as CadExactArc
    check(nearCadAssist(arc.start.x,5.0) && nearCadAssist(arc.start.y,0.0))
    check(nearCadAssist(arc.end.x,0.0,1e-8) && nearCadAssist(arc.end.y,5.0,1e-8))

    check(runCatching{CadExactInputEngine.lineEndpoints(0.0,0.0,0.0009,0.0)}.isFailure)
    check(runCatching{CadExactInputEngine.rectangle(0.0,0.0,0.0009,10.0)}.isFailure)
    check(runCatching{CadExactInputEngine.circleRadius(0.0,0.0,0.0009)}.isFailure)

    check(CadAssistViewContract.viewOnly)
    check(CadAssistViewContract.doesNotMutateCad)
    check(CadAssistViewContract.doesNotRecalculateCam)
    check(CadAssistViewContract.presets==listOf("TOP","FRONT","RIGHT","ISO","FIT","RESET"))
    println("CAD_EXACT_3D_ASSIST_PASS|0.001_MM|LINE_RECT_CIRCLE_ARC_HOLE|VIEW_ONLY_360")
}
