package com.aigstudio.core

fun main() {
    val settings=CamSettings(toolDiameter=10.0,depth=-2.0,safeZ=7.0)
    val circle=Circle(center=Vec2(0.0,0.0),radius=30.0)
    val c=CamWorkflowEngine.buildCommonPocket(listOf(circle),settings)
    check(c.pathMode==CamPathMode.MANUAL)
    check(c.manualPath.first().rapid && c.manualPath.first().z==7.0)
    check(c.manualPath.last().rapid && c.manualPath.last().z==7.0)
    check(c.manualPath.any{!it.rapid && it.z==-2.0})

    val rect=listOf(
        Line(a=Vec2(0.0,0.0),b=Vec2(60.0,0.0)),
        Line(a=Vec2(60.0,0.0),b=Vec2(60.0,40.0)),
        Line(a=Vec2(60.0,40.0),b=Vec2(0.0,40.0)),
        Line(a=Vec2(0.0,40.0),b=Vec2(0.0,0.0))
    )
    val r=CamWorkflowEngine.buildCommonPocket(rect,settings)
    check(r.manualPath.first().rapid && r.manualPath.first().z==7.0)
    check(r.manualPath.last().rapid && r.manualPath.last().z==7.0)
    check(r.manualPath.any{!it.rapid && it.z==-2.0})
    println("STUDIO_CAM_POCKET_RETRACT_PASS|CIRCLE|RECT|SAFE_Z_IN_OUT")
}
