package com.aigstudio.core

import kotlin.math.abs

private fun near(a:Double,b:Double,t:Double=1e-6)=abs(a-b)<=t

fun main() {
    val line=Line(id="line",a=Vec2(0.0,0.0),b=Vec2(3.0,4.0))
    check(near(CadMeasurementEngine.length(line),5.0))
    check(near(CadMeasurementEngine.horizontal(line),3.0))
    check(near(CadMeasurementEngine.vertical(line),4.0))
    val circle=Circle(id="circle",center=Vec2(1.0,2.0),radius=5.0)
    check(near(CadMeasurementEngine.radius(circle),5.0))
    check(near(CadMeasurementEngine.diameter(circle),10.0))
    val horizontal=Line(id="h",a=Vec2(0.0,0.0),b=Vec2(10.0,0.0))
    val vertical=Line(id="v",a=Vec2(0.0,0.0),b=Vec2(0.0,10.0))
    check(near(CadMeasurementEngine.angleBetween(horizontal,vertical),90.0))
    val rect=listOf<Entity>(
        Line(id="r0",a=Vec2(0.0,0.0),b=Vec2(20.0,0.0)),
        Line(id="r1",a=Vec2(20.0,0.0),b=Vec2(20.0,10.0)),
        Line(id="r2",a=Vec2(20.0,10.0),b=Vec2(0.0,10.0)),
        Line(id="r3",a=Vec2(0.0,10.0),b=Vec2(0.0,0.0))
    )
    check(near(CadMeasurementEngine.perimeter(rect),60.0,1e-3))
    check(near(CadMeasurementEngine.area(rect),200.0,1e-3))

    val constrainedH=CadConstraintEngine.horizontal(line)
    check(near(constrainedH.a.y,constrainedH.b.y))
    val constrainedV=CadConstraintEngine.vertical(line)
    check(near(constrainedV.a.x,constrainedV.b.x))
    val parallel=CadConstraintEngine.parallel(horizontal,Line(id="p",a=Vec2(2.0,2.0),b=Vec2(4.0,5.0)))
    check(near(parallel.a.y,parallel.b.y))
    val perpendicular=CadConstraintEngine.perpendicular(horizontal,Line(id="q",a=Vec2(2.0,2.0),b=Vec2(5.0,4.0)))
    check(near(perpendicular.a.x,perpendicular.b.x))
    val concentric=CadConstraintEngine.concentric(circle,Circle(id="c2",center=Vec2(9.0,9.0),radius=2.0)) as Circle
    check(concentric.center==circle.center)
    val tangent=CadConstraintEngine.tangentExternal(circle,Circle(id="c3",center=Vec2(20.0,2.0),radius=3.0))
    check(near(tangent.center.distanceTo(circle.center),8.0))

    val dxf=CadDxfCodec.exportAscii(rect+circle)
    val imported=CadDxfCodec.importAscii(dxf)
    check(imported.count{it is Line}==4)
    check(imported.any{it is Circle})

    val slot=CadProfileTools.slot(Vec2(40.0,0.0),20.0,6.0)
    val features=CamFeatureRecognizer.recognize(rect+listOf(Circle(id="inner",center=Vec2(10.0,5.0),radius=2.0))+slot)
    check(features.any{it.kind==CamFeatureKind.OUTER})
    check(features.any{it.kind==CamFeatureKind.INNER})
    check(features.any{it.kind==CamFeatureKind.SLOT})

    println("STUDIO_CAD_ADVANCED_PASS|MEASURE|CONSTRAINT|DXF|CAM_FEATURE")
}
