package com.aigstudio.core

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
    println("NC_FIRST_MOTION_PASS|G90|G0_G1_G2|ABC|TRUE_3D|MATERIAL_REMOVAL|PREFLIGHT_FAIL_CLOSED|AXIS_MODE")
}
