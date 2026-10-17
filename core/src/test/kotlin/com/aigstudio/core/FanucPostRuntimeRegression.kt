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
    check(nc.contains("G80"))
    check(nc.contains("M99"))

    val subprogramNc=FanucPostRuntime.generate(
        paths,safeZ=5.0,programNumber=9,toolNumber=9,hNumber=1,spindleRpm=2300,
        toolChangeSubprogram=4,endSubprogram=5,programEnd="M30"
    )
    check(subprogramNc.lineSequence().any{it=="T9"})
    check(subprogramNc.lineSequence().none{it=="T9 M6"})
    check(subprogramNc.contains("M98 P4"))
    check(subprogramNc.contains("M98 P5"))
    check(subprogramNc.lineSequence().any{it=="M30"})

    val explicitBoth=FanucPostRuntime.generate(
        paths,safeZ=5.0,toolNumber=9,toolChangeSubprogram=4,
        toolChangeMode=FanucToolChangeMode.INLINE_THEN_SUBPROGRAM
    )
    check(explicitBoth.lineSequence().any{it=="T9 M6"})
    check(explicitBoth.contains("M98 P4"))

    check(runCatching{FanucPostRuntime.generate(paths,5.0,toolChangeSubprogram=0)}.isFailure)
    check(runCatching{FanucPostRuntime.generate(paths,5.0,programEnd="M2")}.isFailure)
    check(runCatching{FanucPostRuntime.generate(paths,5.0,toolChangeMode=FanucToolChangeMode.SUBPROGRAM)}.isFailure)

    println("FANUC_POST_RUNTIME_PASS|G90_G54|TOOL_SPINDLE_G43|G0_G1_G3|ABC|SAFE_Z|G80|P4_P5|M99_M30|NO_DUPLICATE_TOOL_CHANGE")
}
