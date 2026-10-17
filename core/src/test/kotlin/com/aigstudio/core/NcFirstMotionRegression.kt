package com.aigstudio.core

import kotlin.math.hypot
import kotlin.math.abs

fun main(){
    val program="G90 G54\nG0 X0 Y0 Z5 A0 B0 C0\nG1 X10 Y0 Z-2 A10 B20 C30 F150\nG2 X10 Y10 Z-2 I0 J5 A15 B25 C35 F120\nG0 Z5"
    val trace=NcFirstMotionParser.parse(program,"6AX")
    check(trace.points.size>=4)
    check(trace.points.first().rapid)
    check(trace.points.any{!it.rapid && it.axisC==30.0})
    check(trace.points.any{it.arcI!=null && it.clockwise==true})
    check(trace.safeZ==5.0)
    check(trace.depth==-2.0)
    check(trace.feedMmMin==120.0)
    val preview=NcFirstMachiningPreviewEngine.build(program,"6AX",toolDiameter=6.0)
    check(preview.removedCells>0)
    check(preview.removedVolumeMm3>0.0)
    check(preview.result.mesh.vertices.isNotEmpty())
    check(preview.result.mesh.triangles.isNotEmpty())
    check(preview.risk.fixtureCoverageWord=="UNMODELED")
    check(!SimAcceptancePolicy.formalAcceptAllowed(preview.risk))
    check(runCatching{NcFirstMotionParser.parse("G90\nG0 X0 Y0 Z5\nG1 X1 Z-1 C10 F100","5AX")}.isFailure)

    val g34="G90 G54\nG0 X0 Y0 Z30\nG34 J0 I30 K6 G83 R3 Z-20 Q2 F150\nG80"
    val g34Trace=NcFirstMotionParser.parse(g34,"3AX")
    check(g34Trace.g34HoleCount==6)
    check(g34Trace.cannedCycleHoleCount==6)
    check("G83_FULL_R_RETRACT" in g34Trace.cycleModels)
    check(g34Trace.safeZ==3.0)
    check(g34Trace.depth==-20.0)
    val holeBottoms=g34Trace.points.filter{!it.rapid && abs(it.z+20.0)<1e-9}
    check(holeBottoms.size==6)
    check(holeBottoms.all{abs(hypot(it.x,it.y)-15.0)<1e-6})
    val g34Preview=NcFirstMachiningPreviewEngine.build(g34,"3AX",toolDiameter=6.0)
    check(g34Preview.removedCells>0)
    check(g34Preview.removedVolumeMm3>0.0)

    val g81="G90\nG0 X0 Y0 Z20\nG99 G81 X0 Y0 Z-5 R2 F100\nX10 Y0\nG80"
    val g81Trace=NcFirstMotionParser.parse(g81,"3AX")
    check(g81Trace.cannedCycleHoleCount==2)
    check("G81_STANDARD" in g81Trace.cycleModels)
    check(g81Trace.points.count{!it.rapid && it.z==-5.0}==2)

    val g73="G90\nG0 X0 Y0 Z20\nG98 G73 X0 Y0 Z-8 R3 Q2 F100\nG80"
    val g73Trace=NcFirstMotionParser.parse(g73,"3AX")
    check(g73Trace.cannedCycleHoleCount==1)
    check("G73_CONSERVATIVE_FULL_R_RETRACT" in g73Trace.cycleModels)

    println("NC_FIRST_MOTION_PASS|G90|G0_G1_G2|ABC|G34_I_DIAMETER_K_COUNT|G81|G73_CONSERVATIVE|G83|G98_G99|TRUE_3D|MATERIAL_REMOVAL|PREFLIGHT_FAIL_CLOSED|AXIS_MODE")
}
