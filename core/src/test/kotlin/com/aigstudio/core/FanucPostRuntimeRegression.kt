package com.aigstudio.core

fun main(){
    val paths=listOf(Toolpath(listOf(
        Rapid(Vec2(0.0,0.0),5.0),
        Feed(Vec2(10.0,0.0),150.0,-2.0,10.0,20.0,30.0),
        ArcFeed(Vec2(10.0,10.0),Vec2(0.0,5.0),false,120.0,-2.0,10.0,20.0,30.0),
        Rapid(Vec2(10.0,10.0),5.0)
    )))
    val nc=FanucPostRuntime.generate(paths,safeZ=5.0,compensation="G41",programNumber=1234,toolNumber=9,hNumber=1,spindleRpm=2300)
    check(nc.contains("O1234"))
    check(nc.contains("G90 G54"))
    check(nc.contains("T9 M6"))
    check(nc.contains("S2300 M3"))
    check(nc.contains("G43 Z5.000 H1 M8"))
    check(nc.contains("G1 X10.000 Y0.000 Z-2.000 A10.000 B20.000 C30.000 F150.000"))
    check(nc.contains("G3 X10.000 Y10.000 Z-2.000 I0.000 J5.000 A10.000 B20.000 C30.000 F120.000"))
    check(nc.contains("G40"))
    check(nc.contains("M99"))
    println("FANUC_POST_RUNTIME_PASS|G90_G54|TOOL_SPINDLE_G43|G0_G1_G3|ABC|SAFE_Z|M99")
}
