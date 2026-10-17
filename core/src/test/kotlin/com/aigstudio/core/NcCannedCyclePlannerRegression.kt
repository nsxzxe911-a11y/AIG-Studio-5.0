package com.aigstudio.core

fun main(){
    val holes=NcCycleGeometry.circularPattern(0.0,0.0,15.0,6,90.0)
    val g83=NcCannedCyclePlanner.expand(
        holes,
        NcCannedCycleSpec(NcCannedCycleKind.G83,3.0,-20.0,2.0,150.0,30.0,true)
    )
    check(g83.holeCount==6)
    check(g83.steps.count{!it.rapid && it.z==-20.0}==6)
    check(g83.steps.count{!it.rapid}==72)
    check(g83.steps.any{it.rapid && it.z==30.0})
    check(g83.modelTag=="G83_FULL_R_RETRACT")

    val g81=NcCannedCyclePlanner.expand(
        listOf(10.0 to 20.0),
        NcCannedCycleSpec(NcCannedCycleKind.G81,3.0,-10.0,null,120.0,30.0,false)
    )
    check(g81.steps.count{!it.rapid}==1)
    check(g81.steps.last().rapid && g81.steps.last().z==3.0)

    val g73=NcCannedCyclePlanner.expand(
        listOf(0.0 to 0.0),
        NcCannedCycleSpec(NcCannedCycleKind.G73,3.0,-8.0,2.0,100.0,20.0,true)
    )
    check(g73.modelTag=="G73_CONSERVATIVE_FULL_R_RETRACT")

    println("NC_CANNED_CYCLE_PLANNER_PASS|G81|G73_CONSERVATIVE|G83|G34_K6|G98_G99_RETURN")
}
